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

import "hardhat/console.sol";

contract StrategyBorrowMeshSwapUsdt is Strategy, UniswapV2Exchange, BalancerExchange {
    using OvnMath for uint256;

    uint256 constant MAX_UINT_VALUE = type(uint256).max;

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public aUsdcToken;
    IERC20 public meshToken;
    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;

    IMeshSwapLP public meshSwapUsdt;
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

    event StrategyUpdatedParams(address meshSwapUsdt, address meshSwapRouter, address balancerVault, bytes32 balancerPoolIdUsdcTusdDaiUsdt);

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
        address _meshSwapUsdt,
        address _meshSwapRouter,
        address _balancerVault,
        bytes32 _poolIdUsdcTusdDaiUsdt
    ) external onlyAdmin {

        require(_meshSwapUsdt != address(0), "Zero address not allowed");
        require(_meshSwapRouter != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_poolIdUsdcTusdDaiUsdt != "", "Empty pool id not allowed");

        meshSwapUsdt = IMeshSwapLP(_meshSwapUsdt);
        _setUniswapRouter(_meshSwapRouter);
        setBalancerVault(_balancerVault);
        poolIdUsdcTusdDaiUsdt = _poolIdUsdcTusdDaiUsdt;

        emit StrategyUpdatedParams(_meshSwapUsdt, _meshSwapRouter, _balancerVault, _poolIdUsdcTusdDaiUsdt);
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
        console.log("stake");

        require(_asset == address(usdcToken), "Some token not compatible");

        uint usdcCollateral = usdcToken.balanceOf(address(this));
        uint256 usdtCollateral = AaveBorrowLibrary.convertTokenAmountToTokenAmount(
            usdcCollateral,
            usdcTokenDenominator,
            usdtTokenDenominator,
            uint256(oracleChainlinkUsdc.latestAnswer()),
            uint256(oracleChainlinkUsdt.latestAnswer())
        );
        uint256 usdtBorrow = usdtCollateral * liquidationThreshold / healthFactor;

        // supply and borrow in aave
        address aavePool = AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId);
        usdcToken.approve(aavePool, usdcCollateral);
        IPool(aavePool).supply(address(usdcToken), usdcCollateral, address(this), referralCode);
        IPool(aavePool).borrow(address(usdtToken), usdtBorrow, interestRateMode, referralCode, address(this));

        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        console.log("usdtBalance: %s", usdtBalance);
        // deposit to mesh
        usdtToken.approve(address(meshSwapUsdt), usdtBalance);
        meshSwapUsdt.depositToken(usdtBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        console.log("unstake");

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 usdcCollateral = OvnMath.addBasisPoints(_amount, BASIS_POINTS_FOR_SLIPPAGE);
        uint256 usdtCollateral = AaveBorrowLibrary.convertTokenAmountToTokenAmount(
            usdcCollateral,
            usdcTokenDenominator,
            usdtTokenDenominator,
            uint256(oracleChainlinkUsdc.latestAnswer()),
            uint256(oracleChainlinkUsdt.latestAnswer())
        );
        uint256 usdtBorrow = usdtCollateral * liquidationThreshold / healthFactor;

        // withdraw from mesh
        meshSwapUsdt.withdrawToken(usdtBorrow);
        console.log("usdtBalance withdrawed: %s", usdtToken.balanceOf(address(this)));


        // repay and withdraw from aave
        address aavePool = AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId);
        usdtToken.approve(aavePool, usdtToken.balanceOf(address(this)));
        IPool(aavePool).repay(address(usdtToken), usdtToken.balanceOf(address(this)), interestRateMode, address(this));
        IPool(aavePool).withdraw(address(usdcToken), usdcCollateral, address(this));

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

        console.log("usdtBalance: %s", usdtToken.balanceOf(address(this)));
        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));
        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        console.log("unstakeFull");

        require(_asset == address(usdcToken), "Some token not compatible");

        //TODO fix count
        uint256 usdtTokenAmount = meshSwapUsdt.balanceOf(address(this)) * 2;
        console.log("usdtTokenAmount: %s", usdtTokenAmount);
        // withdraw from mesh
        meshSwapUsdt.withdrawToken(usdtTokenAmount);
        console.log("usdtBalance: %s", usdtToken.balanceOf(address(this)));

        //TODO check if usdt enough for repay and need to leave some usdc for it
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        if (usdtBalance > 200000) {
            usdtBalance -= 200000;
        } else {
            usdtBalance = 200000;
        }

        // repay and withdraw from aave
        address aavePool = AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId);
        usdtToken.approve(aavePool, usdtToken.balanceOf(address(this)));
        IPool(aavePool).repay(address(usdtToken), usdtBalance, interestRateMode, address(this));
        IPool(aavePool).withdraw(address(usdcToken), aUsdcToken.balanceOf(address(this)), address(this));

        // swap usdt to usdc
        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));
        usdtBalance = usdtToken.balanceOf(address(this));
        console.log("usdtBalance: %s", usdtBalance);
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

        console.log("usdtBalance: %s", usdtToken.balanceOf(address(this)));
        console.log("usdcBalance: %s", usdcToken.balanceOf(address(this)));
        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    //TODO fix count
    function _totalValue() internal view returns (uint256) {
        // get total balance usdc in strategy
        uint256 usdcBalance = usdcToken.balanceOf(address(this));

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
        meshSwapUsdt.claimReward();

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

    //TODO check if it works OK
    function _healthFactorBalance() internal override returns (uint256) {

        address aavePool = AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), eModeCategoryId);
        (uint256 collateral, uint256 borrow,,,, uint256 healthFactorCurrent) = IPool(aavePool).getUserAccountData(address(this));

        if (healthFactorCurrent.abs(healthFactor) < balancingDelta) {
            return healthFactorCurrent;
        }

        if (healthFactorCurrent > healthFactor) {

            uint256 neededUsdc = AaveBorrowLibrary.convertUsdToTokenAmount(collateral - borrow, usdcTokenDenominator, uint256(oracleChainlinkUsdc.latestAnswer()));
            uint256 neededUsdt = AaveBorrowLibrary.convertUsdToTokenAmount(collateral - borrow, usdtTokenDenominator, uint256(oracleChainlinkUsdt.latestAnswer()));

            // withdraw and borrow
            IPool(aavePool).withdraw(address(usdcToken), neededUsdc, address(this));
            IPool(aavePool).borrow(address(usdtToken), neededUsdt, interestRateMode, referralCode, address(this));

            // add liquidity
            usdtToken.approve(address(meshSwapUsdt), neededUsdt);
            meshSwapUsdt.depositToken(neededUsdt);

        } else {

            uint256 neededUsdc = AaveBorrowLibrary.convertUsdToTokenAmount(borrow - collateral, usdcTokenDenominator, uint256(oracleChainlinkUsdc.latestAnswer()));
            uint256 neededUsdt = AaveBorrowLibrary.convertUsdToTokenAmount(borrow - collateral, usdtTokenDenominator, uint256(oracleChainlinkUsdt.latestAnswer()));

            // remove liquidity
            meshSwapUsdt.withdrawToken(neededUsdt);

            // supply and repay
            usdcToken.approve(aavePool, neededUsdc);
            usdtToken.approve(aavePool, neededUsdt);
            IPool(aavePool).supply(address(usdcToken), neededUsdc, address(this), referralCode);
            IPool(aavePool).repay(address(usdtToken), neededUsdt, interestRateMode, address(this));
        }

        (,,,,, healthFactorCurrent) = IPool(aavePool).getUserAccountData(address(this));
        return healthFactorCurrent;
    }

}
