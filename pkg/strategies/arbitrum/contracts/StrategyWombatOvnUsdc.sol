// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";

/**
 * @dev Invest strategy
 * 1) invest USDC to Overnight pool on Wombat
 * 3) Stake lp tokens in Wombex
 *
 * Sell rewards:
 * - WOM on UniswapV3
 * - WMX on Camelot
 */

contract StrategyWombatOvnUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address wom;
        address wmx;
        address assetWombat;
        address poolWombat;
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
    IERC20 public usdt;
    IERC20 public wom;

    IWombatAsset public assetWombat;
    uint256 public assetWombatDm;
    IWombatPool public poolWombat;
    ISwapRouter public uniswapV3Router;

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
        wom = IERC20(params.wom);
        wmx = IERC20(params.wmx);

        assetWombat = IWombatAsset(params.assetWombat);
        poolWombat = IWombatPool(params.poolWombat);

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

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // add liquidity
        (uint256 assetAmount,) = poolWombat.quotePotentialDeposit(address(usdc), _amount);
        usdc.approve(address(poolWombat), _amount);
        poolWombat.deposit(
            address(usdc),
            _amount,
        // 1bp slippage
            OvnMath.subBasisPoints(assetAmount, 1),
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
        (uint256 usdcAmountOneAsset,) = poolWombat.quotePotentialWithdraw(address(usdc), assetWombatDm);
        // add 1bp for smooth withdraw
        uint256 assetAmount = OvnMath.addBasisPoints(_amount, 1) * assetWombatDm / usdcAmountOneAsset;
        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetAmount > assetBalance) {
            assetAmount = assetBalance;
        }

        // unstake
        wombexVault.withdrawAndUnwrap(assetAmount, false);

        // remove liquidity
        assetWombat.approve(address(poolWombat), assetAmount);
        poolWombat.withdraw(
            address(usdc),
            assetAmount,
            _amount,
            address(this),
            block.timestamp
        );

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
        (uint256 usdcAmount,) = poolWombat.quotePotentialWithdraw(address(usdc), assetBalance);
        assetWombat.approve(address(poolWombat), assetBalance);
        poolWombat.withdraw(
            address(usdc),
            assetBalance,
        // 1bp slippage
            OvnMath.subBasisPoints(usdcAmount, 1),
            address(this),
            block.timestamp
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

        uint256 assetBalance = wombexVault.balanceOf(address(this));
        if (assetBalance > 0) {
            (uint256 usdcAmount,) = poolWombat.quotePotentialWithdraw(address(usdc), assetBalance);
            usdcBalance += usdcAmount;
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
