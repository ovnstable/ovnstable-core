// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./exchanges/UniswapV2Exchange.sol";
import "./exchanges/BalancerExchange.sol";
import "./libraries/OvnMath.sol";
import "./connectors/meshswap/interfaces/IMeshSwapLP.sol";
import "./connectors/aave/interfaces/IPoolAddressesProvider.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/aave/interfaces/IPool.sol";
import { AaveBorrowLibrary } from "./libraries/AaveBorrowLibrary.sol";

contract StrategyBorrowMeshSwapUsdcUsdt is Strategy, UniswapV2Exchange, BalancerExchange {
    using OvnMath for uint256;

    uint256 constant MAX_UINT_VALUE = type(uint256).max;
    uint256 constant BALANCING_DELTA = 10 ** 16;

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public aUsdcToken;
    IERC20 public meshToken;
    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;

    IMeshSwapLP public meshSwapUsdcUsdt;
    bytes32 public poolIdUsdcTusdDaiUsdt;

    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleChainlinkUsdc;
    IPriceFeed public oracleChainlinkUsdt;
    uint8 public eModeCategoryId;
    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public balancingDelta;
    uint256 public interestRateMode;
    uint16 public referralCode;


    // --- events

    event StrategyUpdatedTokens(address usdcToken, address usdtToken, address aUsdcToken, address meshToken, uint256 usdcTokenDenominator, uint256 usdtTokenDenominator);

    event StrategyUpdatedParams(address meshSwapUsdcUsdt, address meshSwapRouter, address balancerVault, bytes32 balancerPoolIdUsdcTusdDaiUsdt);

    event StrategyUpdatedAaveParams(address aavePoolAddressesProvider, address oracleChainlinkUsdc, address oracleChainlinkUsdt,
        uint256 eModeCategoryId, uint256 liquidationThreshold, uint256 healthFactor, uint256 balancingDelta, uint256 interestRateMode, uint16 referralCode);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _usdtToken,
        address _aUsdcToken,
        address _meshToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_usdtToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_meshToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        usdtToken = IERC20(_usdtToken);
        aUsdcToken = IERC20(_aUsdcToken);
        meshToken = IERC20(_meshToken);
        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        usdtTokenDenominator = 10 ** IERC20Metadata(_usdtToken).decimals();

        emit StrategyUpdatedTokens(_usdcToken, _usdtToken, _aUsdcToken, _meshToken, usdcTokenDenominator, usdtTokenDenominator);
    }

    function setParams(
        address _meshSwapUsdcUsdt,
        address _meshSwapRouter,
        address _balancerVault,
        bytes32 _poolIdUsdcTusdDaiUsdt
    ) external onlyAdmin {

        require(_meshSwapUsdcUsdt != address(0), "Zero address not allowed");
        require(_meshSwapRouter != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_poolIdUsdcTusdDaiUsdt != "", "Empty pool id not allowed");

        meshSwapUsdcUsdt = IMeshSwapLP(_meshSwapUsdcUsdt);
        _setUniswapRouter(_meshSwapRouter);
        setBalancerVault(_balancerVault);
        poolIdUsdcTusdDaiUsdt = _poolIdUsdcTusdDaiUsdt;

        emit StrategyUpdatedParams(_meshSwapUsdcUsdt, _meshSwapRouter, _balancerVault, _poolIdUsdcTusdDaiUsdt);
    }

    function setAaveParams(
        address _aavePoolAddressesProvider,
        address _oracleChainlinkUsdc,
        address _oracleChainlinkUsdt,
        uint8 _eModeCategoryId,
        uint256 _liquidationThreshold,
        uint256 _healthFactor,
        uint256 _balancingDelta,
        uint256 _interestRateMode,
        uint16 _referralCode
    ) external onlyAdmin {

        require(_aavePoolAddressesProvider != address(0), "Zero address not allowed");
        require(_oracleChainlinkUsdc != address(0), "Zero address not allowed");
        require(_oracleChainlinkUsdt != address(0), "Zero address not allowed");

        aavePoolAddressesProvider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        oracleChainlinkUsdc = IPriceFeed(_oracleChainlinkUsdc);
        oracleChainlinkUsdt = IPriceFeed(_oracleChainlinkUsdt);
        eModeCategoryId = _eModeCategoryId;
        liquidationThreshold = _liquidationThreshold * 10 ** 15;
        healthFactor = _healthFactor * 10 ** 15;
        balancingDelta = _balancingDelta * 10 ** 15;
        interestRateMode = _interestRateMode;
        referralCode = _referralCode;

        emit StrategyUpdatedAaveParams(_aavePoolAddressesProvider, _oracleChainlinkUsdc, _oracleChainlinkUsdt,
            _eModeCategoryId, _liquidationThreshold, _healthFactor, _balancingDelta, _interestRateMode, _referralCode);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveUsdt,) = meshSwapUsdcUsdt.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveUsdt > 10 ** 3, 'Liquidity lpToken reserves too low');

        (uint256 usdcCollateral, uint256 usdtBorrow) = AaveBorrowLibrary.getCollateralAndBorrowForSupplyAndBorrow(
            _amount,
            reserveUsdc,
            reserveUsdt,
            liquidationThreshold,
            healthFactor,
            usdcTokenDenominator,
            usdtTokenDenominator,
            uint256(oracleChainlinkUsdc.latestAnswer()),
            uint256(oracleChainlinkUsdt.latestAnswer())
        );

        // supply and borrow in aave
        address aavePool = AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId);
        usdcToken.approve(aavePool, usdcCollateral);
        IPool(aavePool).supply(address(usdcToken), usdcCollateral, address(this), referralCode);
        IPool(aavePool).borrow(address(usdtToken), usdtBorrow, interestRateMode, referralCode, address(this));

        // add liquidity
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        _addLiquidity(
            address(usdcToken),
            address(usdtToken),
            usdcBalance,
            usdtBalance,
            _subBasisPoints(usdcBalance),
            _subBasisPoints(usdtBalance),
            address(this)
        );
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveUsdt,) = meshSwapUsdcUsdt.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveUsdt > 10 ** 3, 'Liquidity lpToken reserves too low');

        address aavePool = AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId);

        (uint256 collateral, uint256 borrow,,,,) = IPool(aavePool).getUserAccountData(address(this));

        uint256 usdcCollateral = _addBasisPoints(_amount);
        uint256 usdtBorrow = AaveBorrowLibrary.getBorrowForWithdraw(
            usdcCollateral,
            collateral,
            borrow,
            reserveUsdc,
            reserveUsdt,
            liquidationThreshold,
            healthFactor,
            usdcTokenDenominator,
            usdtTokenDenominator,
            uint256(oracleChainlinkUsdc.latestAnswer()),
            uint256(oracleChainlinkUsdt.latestAnswer())
        );

        uint256 lpTokenBalance = meshSwapUsdcUsdt.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            // count amount to unstake
            uint256 totalLpBalance = meshSwapUsdcUsdt.totalSupply();
            uint256 lpTokensToWithdraw = AaveBorrowLibrary.getLpTokensForWithdraw(
                totalLpBalance,
                usdtBorrow,
                reserveUsdc,
                reserveUsdt,
                usdcTokenDenominator,
                usdtTokenDenominator,
                uint256(oracleChainlinkUsdc.latestAnswer()),
                uint256(oracleChainlinkUsdt.latestAnswer())
            );
            if (lpTokensToWithdraw > lpTokenBalance) {
                lpTokensToWithdraw = lpTokenBalance;
            }

            uint256 amountOutUsdcMin = reserveUsdc * lpTokensToWithdraw / totalLpBalance;
            uint256 amountOutUsdtMin = reserveUsdt * lpTokensToWithdraw / totalLpBalance;

            // remove liquidity
            _removeLiquidity(
                address(usdcToken),
                address(usdtToken),
                address(meshSwapUsdcUsdt),
                lpTokensToWithdraw,
                _subBasisPoints(amountOutUsdcMin),
                _subBasisPoints(amountOutUsdtMin),
                address(this)
            );
        }

        // repay and withdraw from aave
        usdtToken.approve(aavePool, usdtToken.balanceOf(address(this)));
        IPool(aavePool).repay(address(usdtToken), usdtToken.balanceOf(address(this)), interestRateMode, address(this));
        IPool(aavePool).withdraw(address(usdcToken), (usdcCollateral - usdtBorrow * reserveUsdc / reserveUsdt), address(this));

        // swap usdt to usdc if > 1000
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        if (usdtBalance > 1000) {
            swap(
                poolIdUsdcTusdDaiUsdt,
                IVault.SwapKind.GIVEN_IN,
                IAsset(address(usdtToken)),
                IAsset(address(usdcToken)),
                address(this),
                address(this),
                usdtBalance,
                0
            );
        }

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveUsdt,) = meshSwapUsdcUsdt.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveUsdt > 10 ** 3, 'Liquidity lpToken reserves too low');

        uint256 lpTokenBalance = meshSwapUsdcUsdt.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = meshSwapUsdcUsdt.totalSupply();
            uint256 amountOutUsdcMin = reserveUsdc * lpTokenBalance / totalLpBalance;
            uint256 amountOutUsdtMin = reserveUsdt * lpTokenBalance / totalLpBalance;

            // remove liquidity
            _removeLiquidity(
                address(usdcToken),
                address(usdtToken),
                address(meshSwapUsdcUsdt),
                lpTokenBalance,
                _subBasisPoints(amountOutUsdcMin),
                _subBasisPoints(amountOutUsdtMin),
                address(this)
            );
        }

        // swap if usdc < 100000
        uint256 usdcForSwap = 100000;
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        if (usdcBalance < usdcForSwap) {
            usdcForSwap = usdcBalance;
        }
        swap(
            poolIdUsdcTusdDaiUsdt,
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(usdcToken)),
            IAsset(address(usdtToken)),
            address(this),
            address(this),
            usdcForSwap,
            0
        );

        // repay and withdraw from aave
        address aavePool = AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId);
        usdtToken.approve(aavePool, usdtToken.balanceOf(address(this)));
        IPool(aavePool).repay(address(usdtToken), MAX_UINT_VALUE, interestRateMode, address(this));
        IPool(aavePool).withdraw(address(usdcToken), MAX_UINT_VALUE, address(this));

        // swap usdt to usdc
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        if (usdtBalance > 0) {
            swap(
                poolIdUsdcTusdDaiUsdt,
                IVault.SwapKind.GIVEN_IN,
                IAsset(address(usdtToken)),
                IAsset(address(usdcToken)),
                address(this),
                address(this),
                usdtBalance,
                0
            );
        }

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        // get total balance usdc in strategy and in lp tokens
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 lpTokenBalance = meshSwapUsdcUsdt.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = meshSwapUsdcUsdt.totalSupply();
            (uint256 reserveUsdc,,) = meshSwapUsdcUsdt.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
        }

        // get total balance usdt in strategy
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        uint256 usdcBalanceFromUsdt;
        if (usdtBalance > 0) {
            usdcBalanceFromUsdt = onSwap(
                poolIdUsdcTusdDaiUsdt,
                IVault.SwapKind.GIVEN_IN,
                usdtToken,
                usdcToken,
                usdtBalance
            );
        }

        // get total balance usdc in aave for borrow usdt
        uint256 aUsdcBalance = aUsdcToken.balanceOf(address(this));

        return usdcBalance + usdcBalanceFromUsdt + aUsdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        meshSwapUsdcUsdt.claimReward();

        // sell rewards
        uint256 totalUsdc;

        uint256 meshBalance = meshToken.balanceOf(address(this));
        if (meshBalance > 0) {
            uint256 meshUsdc = _swapExactTokensForTokens(
                address(meshToken),
                address(usdcToken),
                meshBalance,
                address(this)
            );
            totalUsdc += meshUsdc;
        }

        usdcToken.transfer(_to, usdcToken.balanceOf(address(this)));

        return totalUsdc;
    }

    function _healthFactorBalance() internal override returns (uint256) {

        address aavePool = AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId);
        (uint256 collateral, uint256 borrow,,,, uint256 healthFactorCurrent) = IPool(aavePool).getUserAccountData(address(this));

        if (healthFactorCurrent.abs(healthFactor) < balancingDelta) {
            return healthFactorCurrent;
        }

        (uint256 reserveUsdc, uint256 reserveUsdt,) = meshSwapUsdcUsdt.getReserves();

        if (healthFactorCurrent > healthFactor) {

            uint256 neededUsdc = AaveBorrowLibrary.getWithdrawAmountForBalance(
                collateral,
                borrow,
                reserveUsdc,
                reserveUsdt,
                liquidationThreshold,
                healthFactor,
                usdcTokenDenominator,
                usdtTokenDenominator,
                uint256(oracleChainlinkUsdc.latestAnswer()),
                uint256(oracleChainlinkUsdt.latestAnswer())
            );

            uint256 neededUsdt = neededUsdc * reserveUsdt / reserveUsdc;

            // withdraw and borrow
            IPool(aavePool).withdraw(address(usdcToken), neededUsdc, address(this));
            IPool(aavePool).borrow(address(usdtToken), neededUsdt, interestRateMode, referralCode, address(this));

            // add liquidity
            _addLiquidity(
                address(usdcToken),
                address(usdtToken),
                neededUsdc,
                neededUsdt,
                _subBasisPoints(neededUsdc),
                _subBasisPoints(neededUsdt),
                address(this)
            );

        } else {

            uint256 neededUsdt = AaveBorrowLibrary.getSupplyAmountForBalance(
                collateral,
                borrow,
                reserveUsdc,
                reserveUsdt,
                liquidationThreshold,
                healthFactor,
                usdcTokenDenominator,
                usdtTokenDenominator,
                uint256(oracleChainlinkUsdc.latestAnswer()),
                uint256(oracleChainlinkUsdt.latestAnswer())
            );

            uint256 lpTokenBalance = meshSwapUsdcUsdt.balanceOf(address(this));
            uint256 totalLpBalance = meshSwapUsdcUsdt.totalSupply();
            uint256 lpTokensToWithdraw = AaveBorrowLibrary.getLpTokensForWithdraw(
                totalLpBalance,
                neededUsdt,
                reserveUsdc,
                reserveUsdt,
                usdcTokenDenominator,
                usdtTokenDenominator,
                uint256(oracleChainlinkUsdc.latestAnswer()),
                uint256(oracleChainlinkUsdt.latestAnswer())
            );
            if (lpTokensToWithdraw > lpTokenBalance) {
                lpTokensToWithdraw = lpTokenBalance;
            }

            // remove liquidity
            (uint256 amountUsdc, uint256 amountUsdt) = _removeLiquidity(
                address(usdcToken),
                address(usdtToken),
                address(meshSwapUsdcUsdt),
                lpTokensToWithdraw,
                _subBasisPoints(reserveUsdc * lpTokensToWithdraw / totalLpBalance),
                _subBasisPoints(reserveUsdt * lpTokensToWithdraw / totalLpBalance),
                address(this)
            );

            // supply and repay
            usdcToken.approve(aavePool, amountUsdc);
            usdtToken.approve(aavePool, amountUsdt);
            IPool(aavePool).supply(address(usdcToken), amountUsdc, address(this), referralCode);
            IPool(aavePool).repay(address(usdtToken), amountUsdt, interestRateMode, address(this));
        }

        (,,,,, healthFactorCurrent) = IPool(aavePool).getUserAccountData(address(this));
        return healthFactorCurrent;
    }

}
