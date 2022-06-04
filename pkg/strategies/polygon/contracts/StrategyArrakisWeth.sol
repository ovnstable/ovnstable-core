// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./connectors/uniswap/v3/libraries/TickMath.sol";
import "./connectors/arrakis/IArrakisV1RouterStaking.sol";
import "./connectors/arrakis/IArrakisRewards.sol";
import "./connectors/arrakis/IArrakisVault.sol";
import "./connectors/aave/interfaces/IPool.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "./exchanges/BalancerExchange.sol";
import "./libraries/OvnMath.sol";
import { AaveBorrowLibrary } from "./libraries/AaveBorrowLibrary.sol";


contract StrategyArrakisWeth is Strategy, BalancerExchange {

    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4; // 0.04%
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%
    uint256 constant MAX_UINT_VALUE = type(uint256).max;

    IERC20 public usdcToken;
    IERC20 public aUsdcToken;
    IERC20 public token0;
    IERC20 public wmaticToken;
    uint256 public usdcTokenDenominator;
    uint256 public token0Denominator;

    IArrakisV1RouterStaking arrakisRouter;
    IArrakisRewards arrakisRewards;
    IArrakisVault arrakisVault;

    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleChainlinkUsdc;
    IPriceFeed public oracleChainlinkToken0;
    uint8 public eModeCategoryId;

    bytes32 public balancerPoolIdWmatic;
    bytes32 public balancerPoolIdToken;
    uint256 liquidationThreshold;
    uint256 healthFactor;
    uint8 usdcTokenInversion;
    uint256 public balancingDelta;
    uint256 public interestRateMode;
    uint16 public referralCode;
    uint256 public usdcStorage;

    // --- events

    event StrategyUpdatedTokens(address usdcToken, address token0, address wmaticToken, address aUsdcToken, uint256 usdcTokenDenominator, uint256 token0Denominator);

    event StrategyUpdatedParams(address arrakisRouter, address arrakisRewards, address arrakisVault, address balancerVault, bytes32 balancerPoolIdToken, bytes32 balancerPoolIdWmatic, uint8 usdcTokenInversion);

    event StrategyUpdatedAaveParams(address aavePoolAddressesProvider, address oracleChainlinkUsdc, address oracleChainlinkToken0,
        uint256 eModeCategoryId, uint256 liquidationThreshold, uint256 healthFactor, uint256 balancingDelta, uint256 interestRateMode, uint16 referralCode);

    event StrategyUpdatedHealthFactor(uint256 healthFactor);

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _token0,
        address _wmaticToken,
        address _aUsdcToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_token0 != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        token0 = IERC20(_token0);
        wmaticToken = IERC20(_wmaticToken);
        aUsdcToken = IERC20(_aUsdcToken);
        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        token0Denominator = 10 ** IERC20Metadata(_token0).decimals();

        emit StrategyUpdatedTokens(_usdcToken, _token0, _wmaticToken, _aUsdcToken, usdcTokenDenominator, token0Denominator);
    }

    function setParams(
        address _arrakisRouter,
        address _arrakisRewards,
        address _arrakisVault,
        address _balancerVault,
        bytes32 _balancerPoolIdToken,
        bytes32 _balancerPoolIdWmatic,
        uint8 _usdcTokenInversion
    ) external onlyAdmin {

        require(_arrakisRouter != address(0), "Zero address not allowed");
        require(_arrakisRewards != address(0), "Zero address not allowed");
        require(_arrakisVault != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_balancerPoolIdToken != "", "Empty pool id not allowed");
        require(_balancerPoolIdWmatic != "", "Empty pool id not allowed");

        arrakisRouter = IArrakisV1RouterStaking(_arrakisRouter);
        arrakisRewards = IArrakisRewards(_arrakisRewards);
        arrakisVault = IArrakisVault(_arrakisVault);

        balancerPoolIdToken = _balancerPoolIdToken;
        balancerPoolIdWmatic = _balancerPoolIdWmatic;
        setBalancerVault(_balancerVault);

        usdcTokenInversion = _usdcTokenInversion;

        emit StrategyUpdatedParams(_arrakisRouter, _arrakisRewards, _arrakisVault, _balancerVault, balancerPoolIdToken, balancerPoolIdWmatic, usdcTokenInversion);
    }

    function setAaveParams(
        address _aavePoolAddressesProvider,
        address _oracleChainlinkUsdc,
        address _oracleChainlinkToken0,
        uint8 _eModeCategoryId,
        uint256 _liquidationThreshold,
        uint256 _healthFactor,
        uint256 _balancingDelta,
        uint256 _interestRateMode,
        uint16 _referralCode
    ) external onlyAdmin {

        require(_aavePoolAddressesProvider != address(0), "Zero address not allowed");
        require(_oracleChainlinkUsdc != address(0), "Zero address not allowed");
        require(_oracleChainlinkToken0 != address(0), "Zero address not allowed");

        aavePoolAddressesProvider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        oracleChainlinkUsdc = IPriceFeed(_oracleChainlinkUsdc);
        oracleChainlinkToken0 = IPriceFeed(_oracleChainlinkToken0);
        eModeCategoryId = _eModeCategoryId;

        liquidationThreshold = _liquidationThreshold * 10 ** 15;
        healthFactor = _healthFactor * 10 ** 15;
        balancingDelta = _balancingDelta * 10 ** 15;
        interestRateMode = _interestRateMode;
        referralCode = _referralCode;

        emit StrategyUpdatedAaveParams(_aavePoolAddressesProvider, _oracleChainlinkUsdc, _oracleChainlinkToken0,
            _eModeCategoryId, _liquidationThreshold, _healthFactor, _balancingDelta, _interestRateMode, _referralCode);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override { 
        require(_asset == address(usdcToken), "Some token not compatible");

        // 1. Recalculate target amount and increese usdcStorage proportionately.
        uint256 amount = OvnMath.subBasisPoints(usdcToken.balanceOf(address(this)) - usdcStorage, BASIS_POINTS_FOR_STORAGE);
        usdcStorage = usdcStorage + usdcToken.balanceOf(address(this)) - amount;


        // 2. Calculate needed collateral and borrow values for aave.
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances();
        (uint256 usdcCollateral, uint256 token0Borrow) = AaveBorrowLibrary.getCollateralAndBorrowForSupplyAndBorrow(
            amount,
            amount0Current,
            amount1Current,
            liquidationThreshold,
            healthFactor,
            usdcTokenDenominator,
            token0Denominator,
            uint256(oracleChainlinkUsdc.latestAnswer()),
            uint256(oracleChainlinkToken0.latestAnswer())
        );


        // 3. Borrowing asset from aave.
        IPool aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId));
        usdcToken.approve(address(aavePool), usdcCollateral);
        aavePool.supply(address(usdcToken), usdcCollateral, address(this), referralCode);
        aavePool.borrow(address(token0), token0Borrow, interestRateMode, referralCode, address(this));


        // 4. Add liquidity to pool.
        uint256 usdcAmount = usdcToken.balanceOf(address(this)) - usdcStorage;
        uint256 token0Amount = token0.balanceOf(address(this));
        usdcToken.approve(address(arrakisRouter), usdcAmount);
        token0.approve(address(arrakisRouter), token0Amount);
        _addLiquidityAndStakeWithSlippage(usdcAmount, token0Amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");


        // 1. Recalculate target amount and decreese usdcStorage proportionately.
        uint256 amount = OvnMath.subBasisPoints(_amount, BASIS_POINTS_FOR_STORAGE);
        usdcStorage = usdcStorage - (_amount - amount);
        amount += 10;


        // 2. Calculate needed borrow value from aave.
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances();
        uint256 token0Borrow = AaveBorrowLibrary.getBorrowForWithdraw(
            amount,
            amount0Current,
            amount1Current,
            liquidationThreshold,
            healthFactor,
            usdcTokenDenominator,
            token0Denominator,
            uint256(oracleChainlinkUsdc.latestAnswer()),
            uint256(oracleChainlinkToken0.latestAnswer())
        );


        // 3. Removing liquidity for aave calculation
        IPool aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId));
        (, uint256 borrow,,,,) = aavePool.getUserAccountData(address(this));
        uint256 totalBorrowUsd1 = AaveBorrowLibrary.convertUsdToTokenAmount(borrow, token0Denominator, uint256(oracleChainlinkToken0.latestAnswer())); 

        if (token0Borrow > totalBorrowUsd1) {
            uint256 amountLp = _getLiquidityForToken(totalBorrowUsd1);
            arrakisRewards.approve(address(arrakisRouter), amountLp);
            _removeLiquidityAndUnstakeWithSlippage(amountLp);
            token0.approve(address(aavePool), token0.balanceOf(address(this)));
            aavePool.repay(address(token0), MAX_UINT_VALUE, interestRateMode, address(this));
            aavePool.withdraw(address(usdcToken), MAX_UINT_VALUE, address(this));
        } else {
            uint256 amountLp = _getLiquidityForToken(token0Borrow);
            arrakisRewards.approve(address(arrakisRouter), amountLp);
            _removeLiquidityAndUnstakeWithSlippage(amountLp);
            token0.approve(address(aavePool), token0.balanceOf(address(this)));
            aavePool.repay(address(token0), token0.balanceOf(address(this)), interestRateMode, address(this));
            uint256 getusdc = amount - (token0Borrow * amount0Current) / amount1Current;
            aavePool.withdraw(address(usdcToken), getusdc, address(this));
        }


        // 4. If after aave manipulations we have already needed amount of usdt then return it.
        if (usdcToken.balanceOf(address(this)) - usdcStorage >= _amount) {
            return usdcToken.balanceOf(address(this)) - usdcStorage;
        }


        // 5. If don't, remove liquidity and swap all token0 to usdc.
        uint256 neededUsdc = _amount - (usdcToken.balanceOf(address(this)) - usdcStorage);
        (amount0Current, amount1Current) = _getUnderlyingBalances();
        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        uint256 lpTokensToWithdraw = _getAmountLpTokensToWithdraw(
            OvnMath.addBasisPoints(neededUsdc, BASIS_POINTS_FOR_SLIPPAGE),
            amount0Current,
            amount1Current,
            amountLp,
            usdcTokenDenominator,
            token0Denominator,
            balancerPoolIdToken,
            usdcToken,
            token0
        );
        arrakisRewards.approve(address(arrakisRouter), lpTokensToWithdraw);
        _removeLiquidityAndUnstakeWithSlippage(lpTokensToWithdraw);
        swap(balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(token0)), IAsset(address(usdcToken)), 
            address(this), address(this), token0.balanceOf(address(this)), 0);

        return usdcToken.balanceOf(address(this)) - usdcStorage;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");


        // 1. Calculate total amount of LP tokens and remove liquidity from the pool.
        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        _removeLiquidityAndUnstakeWithSlippage(amountLp);


        // 2. Convert all storage assets to token0.
        swap(balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(usdcToken)),
                IAsset(address(token0)), address(this), address(this), usdcStorage, 0);


        // 3. Full exit from aave.
        IPool aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId));
        token0.approve(address(aavePool), token0.balanceOf(address(this)));
        aavePool.repay(address(token0), MAX_UINT_VALUE, interestRateMode, address(this));
        aavePool.withdraw(address(usdcToken), MAX_UINT_VALUE, address(this));


        // 4. Swap remaining token0 to usdc
        if (token0.balanceOf(address(this)) > 0) {
            swap(balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(token0)),
                    IAsset(address(usdcToken)), address(this), address(this), token0.balanceOf(address(this)), 0);
        }

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external override view returns (uint256) {
        return _getTotal();
    }

    function liquidationValue() external override view returns (uint256) {
        return _getTotal();
    }

    function _getTotal() internal view returns (uint256){
        
        uint256 balanceLp = arrakisRewards.balanceOf(address(this));

        if (balanceLp == 0)
            return 0;

        (uint256 poolUsdc, uint256 poolToken0) = _getTokensForLiquidity(balanceLp);  
        uint256 aaveUsdc = aUsdcToken.balanceOf(address(this));
        IPool aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider)));
        (, uint256 aaveToken0,,,,) = aavePool.getUserAccountData(address(this));
        aaveToken0 = AaveBorrowLibrary.convertUsdToTokenAmount(aaveToken0, token0Denominator, uint256(oracleChainlinkToken0.latestAnswer()));
        uint256 result = usdcToken.balanceOf(address(this)) + poolUsdc + aaveUsdc;
        
        if (aaveToken0 < poolToken0) {
            uint256 delta = poolToken0 - aaveToken0;
            if (delta > poolToken0 / 100) {
                delta = onSwap(balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, token0, usdcToken, delta);
                result = result + delta;
            }
        } else {
            uint256 delta = aaveToken0 - poolToken0;
            if (delta > poolToken0 / 100) {
                delta = onSwap(balancerPoolIdToken, IVault.SwapKind.GIVEN_OUT, usdcToken, token0, delta);
                result = result - delta;
            }
        }
        return result;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // 1. Claiming all existing rewards.
        if (arrakisRewards.balanceOf(address(this)) != 0) {
            arrakisRewards.claim_rewards(address(this));
        }


        // 2. Convert all assets to usdc.
        uint256 wmaticBalance = wmaticToken.balanceOf(address(this));
        if (wmaticBalance > 0) {
            uint256 usdcAmount = swap(balancerPoolIdWmatic, IVault.SwapKind.GIVEN_IN, IAsset(address(wmaticToken)),
                IAsset(address(usdcToken)), address(this), address(this), wmaticBalance, 0);
            usdcToken.transfer(_to, usdcAmount);
            return usdcAmount;
        } else {
            return 0;
        }
    }

    function _getLiquidityForToken(uint256 token0Borrow) internal view returns (uint256) {
        (, uint256 amount1Current) = _getUnderlyingBalances();
        uint256 amountLp = token0Borrow * arrakisVault.totalSupply() / amount1Current;
        return amountLp;
    }

    function _getTokensForLiquidity(uint256 balanceLp) internal view returns (uint256, uint256) {
        (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances();

        uint256 amountLiq0 = amount0Current * balanceLp / arrakisVault.totalSupply();
        uint256 amountLiq1 = amount1Current * balanceLp / arrakisVault.totalSupply();
        return (usdcTokenInversion == 0) ? (amountLiq0, amountLiq1) : (amountLiq0, amountLiq1);
    }

    function _addLiquidityAndStakeWithSlippage(uint256 usdcAmount, uint256 token0Amount) internal {
        if (usdcTokenInversion == 0) {
        arrakisRouter.addLiquidityAndStake(
                address(arrakisRewards), 
                usdcAmount, 
                token0Amount, 
                OvnMath.subBasisPoints(usdcAmount, BASIS_POINTS_FOR_SLIPPAGE), 
                OvnMath.subBasisPoints(token0Amount, BASIS_POINTS_FOR_SLIPPAGE), 
                address(this)
            );
        } else {
            arrakisRouter.addLiquidityAndStake(
                address(arrakisRewards), 
                token0Amount,
                usdcAmount,
                OvnMath.subBasisPoints(token0Amount, BASIS_POINTS_FOR_SLIPPAGE), 
                OvnMath.subBasisPoints(usdcAmount, BASIS_POINTS_FOR_SLIPPAGE), 
                address(this)
            );
        }
    }

    function _removeLiquidityAndUnstakeWithSlippage(uint256 amountLp) internal returns (uint256, uint256) {
        (uint256 amountLiq0, uint256 amountLiq1) = _getTokensForLiquidity(amountLp);
        (uint256 amount0, uint256 amount1,) = arrakisRouter.removeLiquidityAndUnstake(
            address(arrakisRewards), 
            amountLp, 
            (amountLiq0 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq0, BASIS_POINTS_FOR_SLIPPAGE), 
            (amountLiq1 == 0) ? 0 : OvnMath.subBasisPoints(amountLiq1, BASIS_POINTS_FOR_SLIPPAGE), 
            address(this)
        );
        
        return (usdcTokenInversion == 0) ? (amount0, amount1) : (amount1, amount0);
    }

    function _getUnderlyingBalances() internal view returns (uint256, uint256) {
        (uint256 amount0, uint256 amount1) = arrakisVault.getUnderlyingBalances();
        return (usdcTokenInversion == 0) ? (amount0, amount1) : (amount1, amount0);
    }

    function _setHealthFactor(
        uint256 _healthFactor
    ) internal override {
        healthFactor = _healthFactor * 10 ** 15;

        emit StrategyUpdatedHealthFactor(_healthFactor);
    }

    // function _healthFactorBalance() internal override returns (uint256) { 
        
    //     IPool aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId));
    //     (uint256 collateral, uint256 borrow,,,,uint256 healthFactorCurrent) = aavePool.getUserAccountData(address(this));
    //     uint256 price = uint256(oracleChainlinkUsdc.latestAnswer());
    //     (uint256 amount0Current, uint256 amount1Current) = _getUnderlyingBalances();

    //     if (OvnMath.abs(healthFactorCurrent, healthFactor) < balancingDelta) {
    //         return healthFactorCurrent;
    //     }

    //     if (healthFactorCurrent > healthFactor) {
    //         uint256 neededUsdc = AaveBorrowLibrary.getWithdrawAmountForBalance(
    //             collateral,
    //             borrow,
    //             amount0Current,
    //             amount1Current,
    //             liquidationThreshold,
    //             healthFactor,
    //             usdcTokenDenominator,
    //             token0Denominator,
    //             uint256(oracleChainlinkUsdc.latestAnswer()),
    //             uint256(oracleChainlinkToken0.latestAnswer())
    //         );
    //         uint256 neededToken0 = (neededUsdc * amount1Current) / amount0Current;
        
    //         aavePool.withdraw(address(usdcToken), neededUsdc, address(this));
    //         aavePool.borrow(address(token0), neededToken0, interestRateMode, referralCode, address(this));

    //         usdcToken.approve(address(arrakisRouter), neededUsdc);
    //         token0.approve(address(arrakisRouter), neededToken0);
    //         _addLiquidityAndStakeWithSlippage(neededUsdc, neededToken0);
    //     } else {
    //         uint256 neededToken0 = AaveBorrowLibrary.getSupplyAmountForBalance(
    //             collateral,
    //             borrow,
    //             amount0Current,
    //             amount1Current,
    //             liquidationThreshold,
    //             healthFactor,
    //             usdcTokenDenominator,
    //             token0Denominator,
    //             uint256(oracleChainlinkUsdc.latestAnswer()),
    //             uint256(oracleChainlinkToken0.latestAnswer())
    //         );
    //         uint256 amountLp = _getLiquidityForToken(neededToken0);
    //         arrakisRewards.approve(address(arrakisRouter), amountLp);
            
    //         (uint256 amount0, uint256 amount1) = _removeLiquidityAndUnstakeWithSlippage(amountLp);

    //         usdcToken.approve(address(aavePool), amount0);
    //         aavePool.supply(address(usdcToken), amount0, address(this), referralCode);

    //         token0.approve(address(aavePool), amount1);
    //         aavePool.repay(address(token0), amount1, interestRateMode, address(this));
    //     }

    //     (,,,,, healthFactorCurrent) = aavePool.getUserAccountData(address(this));
    //     return healthFactorCurrent;
    // }
}
