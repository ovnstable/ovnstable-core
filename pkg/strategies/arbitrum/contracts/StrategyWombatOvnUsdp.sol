// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";


/**
 * @dev Self-investment strategy
 * 1) sell all USDC -> buy USD+ on self-investment pool (Overnight)
 * 2) invest USD+ to Overnight pool on Wombat
 * 3) Stake lp tokens in Wombex
 *
 * Sell rewards:
 * - WOM on UniswapV3
 * - WMX on Camelot
 *
 */

contract StrategyWombatOvnUsdp is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address usdp;
        address wom;
        address wmx;
        address assetWombat;
        address poolWombat;
        address masterWombat;
        address wombatRouter;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
        address wombexBooster;
        uint256 wombexBoosterPid;
        address wombexVault;
        address camelorRouter;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public usdp;
    IERC20 public usdt;
    IERC20 public wom;

    IWombatAsset public assetWombat;
    uint256 public assetWombatDm;
    IWombatPool public poolWombat;
    IMasterWombatV2 public masterWombat;
    ISwapRouter public uniswapV3Router;
    IWombatRouter public router;

    uint24 public poolFee0;
    uint24 public poolFee1;

    IWombexBooster public wombexBooster;
    uint256 public wombexBoosterPid;
    IWombexVault public wombexVault;
    IERC20 public wmx;

    ICamelotRouter public camelorRouter;

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
        usdp = IERC20(params.usdp);
        wom = IERC20(params.wom);
        wmx = IERC20(params.wmx);

        assetWombat = IWombatAsset(params.assetWombat);
        poolWombat = IWombatPool(params.poolWombat);
        masterWombat = IMasterWombatV2(params.masterWombat);
        router = IWombatRouter(params.wombatRouter);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        assetWombatDm = 10 ** IERC20Metadata(params.assetWombat).decimals();

        wombexBooster = IWombexBooster(params.wombexBooster);
        wombexBoosterPid = params.wombexBoosterPid;
        wombexVault = IWombexVault(params.wombexVault);

        camelorRouter = ICamelotRouter(params.camelorRouter);

        emit StrategyUpdatedParams();
    }


    function _swapAllToken0ToToken1(IERC20 token0, IERC20 token1) internal {

        uint256 amountToSwap = token0.balanceOf(address(this));

        uint256 amountOut = WombatLibrary.getAmountOut(
            router,
            address(token0),
            address(token1),
            address(poolWombat),
            amountToSwap
        );

        if (amountOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                router,
                address(token0),
                address(token1),
                address(poolWombat),
                amountToSwap,
                0,
                address(this)
            );
        }
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {


        // Swap all USDC to USD+
        _swapAllToken0ToToken1(usdc, usdp);

        uint256 usdpAmount = usdp.balanceOf(address(this));

        // add liquidity
        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(usdp), usdpAmount);
        usdp.approve(address(poolWombat), usdpAmount);
        poolWombat.deposit(
            address(usdp),
            usdpAmount,
            // 1bp slippage
            OvnMath.subBasisPoints(assetAmount, stakeSlippageBP),
            address(this),
            block.timestamp,
            false
        );

        // stake
        uint256 assetBalance = assetWombat.balanceOf(address(this));
        assetWombat.approve(address(wombexBooster), assetBalance);
        wombexBooster.deposit(wombexBoosterPid, assetBalance, true);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        (uint256 usdpAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(usdp), assetWombatDm);

        uint256 assetAmount = OvnMath.addBasisPoints(_amount, swapSlippageBP) * assetWombatDm / usdpAmountOneAsset;
        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        // unstake
        wombexVault.withdrawAndUnwrap(assetAmount, false);

        // remove liquidity
        assetWombat.approve(address(poolWombat), assetAmount);
        poolWombat.withdraw(
            address(usdp),
            assetAmount,
            _amount,
            address(this),
            block.timestamp
        );

        // Swap All USD+ to USDC
        _swapAllToken0ToToken1(usdp, usdc);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        uint256 assetBalance = wombexVault.balanceOf(address(this));

        // unstake
        wombexVault.withdrawAndUnwrap(assetBalance, false);

        // remove liquidity
        (uint256 usdpAmount,) = poolWombat.quotePotentialWithdraw(address(usdp), assetBalance);
        assetWombat.approve(address(poolWombat), assetBalance);
        poolWombat.withdraw(
            address(usdp),
            assetBalance,
            OvnMath.subBasisPoints(usdpAmount, 1),
            address(this),
            block.timestamp
        );

        // Swap All USD+ to USDC
        _swapAllToken0ToToken1(usdp, usdc);

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
        usdcBalance += usdp.balanceOf(address(this));

        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetBalance > 0) {
            (uint256 usdpAmount,) = poolWombat.quotePotentialWithdraw(address(usdp), assetBalance);
            usdcBalance += usdpAmount;
        }

        return usdcBalance;
    }



    function _claimRewards(address _to) internal override returns (uint256) {

        wombexVault.getReward(address(this), false);

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

        uint256 wmxBalance = wmx.balanceOf(address(this));
        if (wmxBalance > 0) {

            uint256 amountOut = CamelotLibrary.getAmountsOut(
                camelorRouter,
                address(wmx),
                address(usdt),
                address(usdc),
                wmxBalance
            );

            if (amountOut > 0) {
                uint256 balanceUsdcBefore = usdc.balanceOf(address(this));
                CamelotLibrary.multiSwap(
                    camelorRouter,
                    address(wmx),
                    address(usdt),
                    address(usdc),
                    wmxBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
                totalUsdc += (usdc.balanceOf(address(this)) - balanceUsdcBefore);
            }

        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
