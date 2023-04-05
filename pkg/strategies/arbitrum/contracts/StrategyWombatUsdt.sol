// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

import "hardhat/console.sol";
contract StrategyWombatUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address wom;
        address assetWombat;
        address poolWombat;
        address masterWombat;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
        address curvePool;
        address oracleUsdc;
        address oracleUsdt;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public wom;

    uint256 public usdcDm;
    uint256 public usdtDm;

    IAsset public assetWombat;
    uint256 public assetWombatDm;
    IPool public poolWombat;
    IMasterWombatV2 public masterWombat;
    ISwapRouter public uniswapV3Router;

    uint24 public poolFee0;
    uint24 public poolFee1;

    address public curvePool;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        wom = IERC20(params.wom);

        assetWombat = IAsset(params.assetWombat);
        poolWombat = IPool(params.poolWombat);
        masterWombat = IMasterWombatV2(params.masterWombat);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        assetWombatDm = 10 ** IERC20Metadata(params.assetWombat).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        curvePool = params.curvePool;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        uint256 usdcAmountIn = usdc.balanceOf(address(this));

        CurveLibrary.swap(
            curvePool,
            address(usdc),
            address(usdt),
            usdcAmountIn,
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcAmountIn), swapSlippageBP)
        );

        // add liquidity

        uint256 usdtAmountIn = usdt.balanceOf(address(this));
        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(usdt), usdtAmountIn);
        usdt.approve(address(poolWombat), usdtAmountIn);
        poolWombat.deposit(
            address(usdt),
            usdtAmountIn,
        // 1bp slippage
            OvnMath.subBasisPoints(assetAmount, 1),
            address(this),
            block.timestamp,
            false
        );

        // stake
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        uint256 assetBalance = assetWombat.balanceOf(address(this));
        assetWombat.approve(address(masterWombat), assetBalance);
        masterWombat.deposit(pid, assetBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 usdtAmountForUsdcAmount = CurveLibrary.getAmountOut(curvePool, address(usdc), address(usdt), _amount);

        // get amount to unstake
        (uint256 usdcAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(usdt), assetWombatDm);
        // add 1bp for smooth withdraw
        uint256 assetAmount = OvnMath.addBasisPoints(usdtAmountForUsdcAmount, swapSlippageBP) * assetWombatDm / usdcAmountOneAsset;

        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        // unstake
        masterWombat.withdraw(pid, assetAmount);

        // remove liquidity
        assetWombat.approve(address(poolWombat), assetAmount);
        poolWombat.withdraw(
            address(usdt),
            assetAmount,
            usdtAmountForUsdcAmount,
            address(this),
            block.timestamp
        );

        uint256 usdtBalance = usdt.balanceOf(address(this));
        CurveLibrary.swap(
            curvePool,
            address(usdt),
            address(usdc),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));

        // unstake
        masterWombat.withdraw(pid, assetBalance);

        // remove liquidity
        (uint256 usdcAmount,) = poolWombat.quotePotentialWithdraw(address(usdc), assetBalance);
        assetWombat.approve(address(poolWombat), assetBalance);
        poolWombat.withdraw(
            address(usdt),
            assetBalance,
            // 1bp slippage
            OvnMath.subBasisPoints(usdcAmount, 1),
            address(this),
            block.timestamp
        );

        uint256 usdtBalance = usdt.balanceOf(address(this));
        CurveLibrary.swap(
            curvePool,
            address(usdt),
            address(usdc),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetBalance > 0) {
            (uint256 usdtAmountFromPool,) = poolWombat.quotePotentialWithdraw(address(usdt), assetBalance);
            usdtBalance += usdtAmountFromPool;
        }

        if(usdtBalance > 0){
            if (nav) {
                usdcBalance += _oracleUsdtToUsdc(usdtBalance);
            } else {
                usdcBalance += CurveLibrary.getAmountOut(curvePool, address(usdt), address(usdc), usdtBalance);
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 pid = masterWombat.getAssetPid(address(assetWombat));
        (uint128 assetBalance,,,) = masterWombat.userInfo(pid, address(this));
        if (assetBalance > 0) {
            masterWombat.deposit(pid, 0);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 womBalance = wom.balanceOf(address(this));
        if (womBalance > 0) {

            uint256 amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(wom),
                address(usdt),
                address(usdc),
                poolFee0,
                poolFee1,
                address(this),
                womBalance,
                0
            );

            totalUsdc += amountOut;
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleUsdtToUsdc(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(amount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(amount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }
}
