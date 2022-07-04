// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./connectors/uniswap/v3/libraries/TickMath.sol";
import "./connectors/dystopia/interfaces/IDystopiaLP.sol";
import "./connectors/dystopia/interfaces/IDystopiaRouter.sol";
import "./connectors/penrose/interface/IUserProxy.sol";
import "./connectors/penrose/interface/IPenLens.sol";
import "./connectors/balancer/interfaces/IVault.sol";
import "./connectors/aave/interfaces/IPool.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "./exchanges/BalancerExchange.sol";
import "./libraries/OvnMath.sol";

import {AaveBorrowLibrary} from "./libraries/AaveBorrowLibrary.sol";
import {BalancerLibrary} from "./libraries/BalancerLibrary.sol";
import {DystopiaLibrary} from "./libraries/DystopiaLibrary.sol";
import {StrategyDystopiaUsdcUsdtLibrary} from "./libraries/StrategyDystopiaUsdcUsdtLibrary.sol";


contract StrategyBorrowDystopiaUsdcUsdt is Strategy {
    using StrategyDystopiaUsdcUsdtLibrary for StrategyBorrowDystopiaUsdcUsdt;

    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4; // 0.04%
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%
    uint256 constant MAX_UINT_VALUE = type(uint256).max;

    IERC20 public usdcToken;
    IERC20 public aUsdcToken;
    IERC20 public token0;
    IERC20 public wmaticToken;
    IERC20 public dystToken;
    uint256 public usdcTokenDenominator;
    uint256 public token0Denominator;

    IDystopiaRouter public dystRouter;
    IDystopiaLP public dystRewards;
    IDystopiaLP public dystVault;

    IERC20 public penToken;
    IUserProxy public userProxy;
    IPenLens public penLens;

    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleChainlinkUsdc;
    IPriceFeed public oracleChainlinkToken0;
    uint8 public eModeCategoryId;

    bytes32 public balancerPoolIdWmatic;
    bytes32 public balancerPoolIdToken;
    IVault  public balancerVault;

    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public usdcTokenInversion;
    uint256 public balancingDelta;
    uint256 public interestRateMode;
    uint16 public referralCode;
    uint256 public usdcStorage;
    uint256 public realHealthFactor;

    // --- events

    event StrategyUpdatedTokens(address usdcToken, address token0, address wmaticToken, address aUsdcToken, uint256 usdcTokenDenominator, uint256 token0Denominator);

    event StrategyUpdatedParams(address dystRouter, address dystRewards, address dystVault, address balancerVault, bytes32 balancerPoolIdToken, bytes32 balancerPoolIdWmatic, uint256 usdcTokenInversion);

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
        address _aUsdcToken,
        address _dystToken,
        address _penToken
    ) external onlyAdmin {
        
        // string memory zeroAddress = "Zero address not allowed";
        // require(_usdcToken != address(0), zeroAddress);
        // require(_token0 != address(0), zeroAddress);
        // require(_wmaticToken != address(0), zeroAddress);
        // require(_aUsdcToken != address(0), zeroAddress);
        // require(_dystToken != address(0), zeroAddress);
        // require(_penToken != address(0), zeroAddress);

        usdcToken = IERC20(_usdcToken);
        token0 = IERC20(_token0);
        wmaticToken = IERC20(_wmaticToken);
        aUsdcToken = IERC20(_aUsdcToken);
        dystToken = IERC20(_dystToken);
        penToken = IERC20(_penToken);
        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        token0Denominator = 10 ** IERC20Metadata(_token0).decimals();

        emit StrategyUpdatedTokens(_usdcToken, _token0, _wmaticToken, _aUsdcToken, usdcTokenDenominator, token0Denominator);
    }

    function setParams(
        address _dystRewards, 
        address _dystVault,
        address _dystRouter,
        address _balancerVault,
        bytes32 _balancerPoolIdToken,
        bytes32 _balancerPoolIdWmatic,
        uint8 _usdcTokenInversion,
        address _userProxy,
        address _penLens
    ) external onlyAdmin {
        
        // string memory zeroAddress = "Zero address not allowed";
        // string memory emptyPool = "Empty pool id not allowed";
        // require(_dystRouter != address(0), zeroAddress);
        // require(_dystRewards != address(0), zeroAddress);
        // require(_dystVault != address(0), zeroAddress);
        // require(_balancerVault != address(0), zeroAddress);
        // require(_userProxy != address(0), zeroAddress);
        // require(_penLens != address(0), zeroAddress);
        // require(_balancerPoolIdToken != "", emptyPool);
        // require(_balancerPoolIdWmatic != "", emptyPool);

        dystRouter = IDystopiaRouter(_dystRouter);
        dystRewards = IDystopiaLP(_dystRewards);
        dystVault = IDystopiaLP(_dystVault);

        balancerPoolIdToken = _balancerPoolIdToken;
        balancerPoolIdWmatic = _balancerPoolIdWmatic;
        balancerVault = IVault(_balancerVault);

        userProxy = IUserProxy(_userProxy);
        penLens = IPenLens(_penLens);

        usdcTokenInversion = _usdcTokenInversion;

        emit StrategyUpdatedParams(_dystRouter, _dystRewards, _dystVault, _balancerVault, balancerPoolIdToken, balancerPoolIdWmatic, usdcTokenInversion);
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

        // string memory zeroAddress = "Zero address not allowed";
        // require(_aavePoolAddressesProvider != address(0), zeroAddress);
        // require(_oracleChainlinkUsdc != address(0), zeroAddress);
        // require(_oracleChainlinkToken0 != address(0), zeroAddress);

        aavePoolAddressesProvider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        oracleChainlinkUsdc = IPriceFeed(_oracleChainlinkUsdc);
        oracleChainlinkToken0 = IPriceFeed(_oracleChainlinkToken0);
        eModeCategoryId = _eModeCategoryId;

        liquidationThreshold = _liquidationThreshold * 10 ** 15;
        healthFactor = _healthFactor * 10 ** 15;
        realHealthFactor = 0;
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
        usdcStorage = usdcToken.balanceOf(address(this)) - amount;


        // 2. Calculate needed collateral and borrow values for aave.
        (uint256 amount0Current, uint256 amount1Current) = this._getUnderlyingBalances();
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
        IPool aavePool = _aavePoolEm();
        usdcToken.approve(address(aavePool), usdcCollateral);
        aavePool.supply(address(usdcToken), usdcCollateral, address(this), referralCode);
        aavePool.borrow(address(token0), token0Borrow, interestRateMode, referralCode, address(this));


        // 4. Add liquidity to pool.
        uint256 usdcAmount = usdcToken.balanceOf(address(this)) - usdcStorage;
        uint256 token0Amount = token0.balanceOf(address(this));
        this._addLiquidityAndStakeWithSlippage(usdcAmount, token0Amount);

        uint256 lpTokenBalance = dystVault.balanceOf(address(this));
        dystVault.approve(address(userProxy), lpTokenBalance);
        userProxy.depositLpAndStake(address(dystVault), lpTokenBalance);
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
        (uint256 amount0Current, uint256 amount1Current) = this._getUnderlyingBalances();
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
        IPool aavePool = _aavePoolEm();
        (, uint256 borrow,,,,) = aavePool.getUserAccountData(address(this));
        uint256 totalBorrowUsd1 = AaveBorrowLibrary.convertUsdToTokenAmount(borrow, token0Denominator, uint256(oracleChainlinkToken0.latestAnswer()));

        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystVault));
        uint256 lpTokenBalance = IERC20(stakingAddress).balanceOf(userProxyThis);

        if (lpTokenBalance > 0) {
            if (token0Borrow > totalBorrowUsd1) {
                uint256 amountLp = this._getLiquidityForToken(totalBorrowUsd1);
                userProxy.unstakeLpAndWithdraw(address(dystVault), amountLp);
                dystVault.approve(address(dystRouter), amountLp);
                this._removeLiquidityAndUnstakeWithSlippage(amountLp);
                token0.approve(address(aavePool), token0.balanceOf(address(this)));
                aavePool.repay(address(token0), MAX_UINT_VALUE, interestRateMode, address(this));
                aavePool.withdraw(address(usdcToken), MAX_UINT_VALUE, address(this));
            } else {
                uint256 amountLp = this._getLiquidityForToken(token0Borrow);
                userProxy.unstakeLpAndWithdraw(address(dystVault), amountLp);
                dystVault.approve(address(dystRouter), amountLp);
                this._removeLiquidityAndUnstakeWithSlippage(amountLp);
                token0.approve(address(aavePool), token0.balanceOf(address(this)));
                aavePool.repay(address(token0), token0.balanceOf(address(this)), interestRateMode, address(this));
                uint256 getusdc = amount - (token0Borrow * amount0Current) / amount1Current;
                aavePool.withdraw(address(usdcToken), getusdc, address(this));
            }
        }


        // 4. If after aave manipulations we have already needed amount of usdc then return it.
        if (usdcToken.balanceOf(address(this)) - usdcStorage >= _amount) {
            return usdcToken.balanceOf(address(this)) - usdcStorage;
        }


        // 5. If don't, remove liquidity and swap all token0 to usdc.
        uint256 neededUsdc = _amount - (usdcToken.balanceOf(address(this)) - usdcStorage);
        (amount0Current, amount1Current) = this._getUnderlyingBalances();
        uint256 amountLp = dystRewards.balanceOf(address(this));
        uint256 lpTokensToWithdraw = BalancerLibrary._getAmountLpTokensToWithdraw(
            balancerVault,
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
        userProxy.unstakeLpAndWithdraw(address(dystVault), lpTokensToWithdraw);

        this._removeLiquidityAndUnstakeWithSlippage(lpTokensToWithdraw);
        BalancerLibrary.swap(balancerVault, balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(token0)), IAsset(address(usdcToken)),
            address(this), address(this), token0.balanceOf(address(this)), 0);

        return usdcToken.balanceOf(address(this)) - usdcStorage;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(usdcToken), "Some token not compatible");


        // 1. Calculate total amount of LP tokens and remove liquidity from the pool.
        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystVault));
        uint256 amountLp = IERC20(stakingAddress).balanceOf(userProxyThis);
        if (amountLp == 0) {
            return 0;
        }
        userProxy.unstakeLpAndWithdraw(address(dystVault), amountLp);
        dystVault.approve(address(dystRouter), amountLp);
        this._removeLiquidityAndUnstakeWithSlippage(amountLp);


        // 2. Convert all storage assets to token0.
        BalancerLibrary.swap(balancerVault, balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(usdcToken)),
            IAsset(address(token0)), address(this), address(this), usdcStorage, 0);


        // 3. Full exit from aave.
        IPool aavePool = _aavePoolEm();
        token0.approve(address(aavePool), token0.balanceOf(address(this)));
        aavePool.repay(address(token0), MAX_UINT_VALUE, interestRateMode, address(this));
        aavePool.withdraw(address(usdcToken), MAX_UINT_VALUE, address(this));


        // 4. Swap remaining token0 to usdc
        if (token0.balanceOf(address(this)) > 0) {
            BalancerLibrary.swap(balancerVault, balancerPoolIdToken, IVault.SwapKind.GIVEN_IN, IAsset(address(token0)),
                IAsset(address(usdcToken)), address(this), address(this), token0.balanceOf(address(this)), 0);
        }

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external override view returns (uint256) {
        return _getTotal(true);
    }

    function liquidationValue() external override view returns (uint256) {
        return _getTotal(false);
    }

    function _getTotal(bool nav) internal view returns (uint256){

        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystVault));
        uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);

        if (balanceLp == 0)
            return 0;

        (uint256 poolUsdc, uint256 poolToken0) = this._getTokensForLiquidity(balanceLp);
        uint256 aaveUsdc = aUsdcToken.balanceOf(address(this));
        IPool aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider)));
        (, uint256 aaveToken0,,,,) = aavePool.getUserAccountData(address(this));
        aaveToken0 = AaveBorrowLibrary.convertUsdToTokenAmount(aaveToken0, token0Denominator, uint256(oracleChainlinkToken0.latestAnswer()));
        uint256 result = usdcToken.balanceOf(address(this)) + poolUsdc + aaveUsdc;

        if (aaveToken0 < poolToken0) {
            uint256 delta = poolToken0 - aaveToken0;
            if (nav) {
                return result + AaveBorrowLibrary.convertTokenAmountToTokenAmount(
                    delta, 
                    token0Denominator, 
                    usdcTokenDenominator, 
                    uint256(oracleChainlinkToken0.latestAnswer()), 
                    uint256(oracleChainlinkUsdc.latestAnswer())
                );
            }
            if (delta > poolToken0 / 100) {
                delta = BalancerLibrary.onSwap(
                    balancerVault,
                    balancerPoolIdToken,
                    IVault.SwapKind.GIVEN_IN,
                    token0,
                    usdcToken,
                    delta
                );
                result = result + delta;
            }
        } else {
            uint256 delta = aaveToken0 - poolToken0;
            if (nav) {
                return result - AaveBorrowLibrary.convertTokenAmountToTokenAmount(
                    delta, 
                    token0Denominator, 
                    usdcTokenDenominator, 
                    uint256(oracleChainlinkToken0.latestAnswer()), 
                    uint256(oracleChainlinkUsdc.latestAnswer())
                );
            }
            if (delta > poolToken0 / 100) {
                delta = BalancerLibrary.onSwap(
                    balancerVault,
                    balancerPoolIdToken,
                    IVault.SwapKind.GIVEN_OUT,
                    usdcToken,
                    token0,
                    delta
                );
                result = result - delta;
            }
        }
        return result;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        userProxy.claimStakingRewards();

        // sell rewards
        uint256 totalUsdc;

        uint256 dystBalance = dystToken.balanceOf(address(this));
        if (dystBalance > 0) {
            uint256 dystUsdc = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(dystToken),
                address(wmaticToken),
                address(usdcToken),
                false,
                false,
                dystBalance,
                address(this)
            );
            totalUsdc += dystUsdc;
        }

        uint256 penBalance = penToken.balanceOf(address(this));
        if (penBalance > 0) {
            uint256 penUsdc = DystopiaLibrary._swapExactTokensForTokens(
                dystRouter,
                address(penToken),
                address(wmaticToken),
                address(usdcToken),
                false,
                false,
                penBalance,
                address(this)
            );
            totalUsdc += penUsdc;
        }

        usdcToken.transfer(_to, usdcToken.balanceOf(address(this)));

        return totalUsdc;
    }


    function _setHealthFactor(
        uint256 _healthFactor
    ) internal override {
        healthFactor = _healthFactor * 10 ** 15;
        emit StrategyUpdatedHealthFactor(_healthFactor);
    }

    function grepRealHealthFactor() external {
        IPool aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId));
        (,,,,, realHealthFactor) = aavePool.getUserAccountData(address(this));
    }

    function _healthFactorBalance() internal override returns (uint256) {
        return this._healthFactorBalanceI();
    }

    function _aavePoolEm() internal returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId));
    }
}
