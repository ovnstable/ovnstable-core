// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";
import {IWombatAsset, IWombatRouter, WombatLibrary} from '@overnight-contracts/connectors/contracts/stuff/Wombat.sol';


contract StrategyWombexUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address busd;
        address usdc;
        address wom;
        address wmx;
        address lpUsdc;
        address wmxLpUsdc;
        address poolDepositor;
        address pool;
        address pancakeRouter;
        address wombatRouter;
        address oracleBusd;
        address oracleUsdc;
    }

    // --- params

    IERC20 public busd;
    IERC20 public usdc;
    IERC20 public wom;
    IERC20 public wmx;

    IWombatAsset public lpUsdc;
    IWombexBaseRewardPool public wmxLpUsdc;
    IWombexPoolDepositor public poolDepositor;
    address public pool;

    IPancakeRouter02 public pancakeRouter;
    IWombatRouter public wombatRouter;

    IPriceFeed public oracleBusd;
    IPriceFeed public oracleUsdc;

    uint256 public busdDm;
    uint256 public usdcDm;
    uint256 public lpUsdcDm;

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
        busd = IERC20(params.busd);
        usdc = IERC20(params.usdc);
        wom = IERC20(params.wom);
        wmx = IERC20(params.wmx);

        lpUsdc = IWombatAsset(params.lpUsdc);
        wmxLpUsdc = IWombexBaseRewardPool(params.wmxLpUsdc);
        poolDepositor = IWombexPoolDepositor(params.poolDepositor);
        pool = params.pool;

        pancakeRouter = IPancakeRouter02(params.pancakeRouter);
        wombatRouter = IWombatRouter(params.wombatRouter);

        oracleBusd = IPriceFeed(params.oracleBusd);
        oracleUsdc = IPriceFeed(params.oracleUsdc);

        busdDm = 10 ** IERC20Metadata(params.busd).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        lpUsdcDm = 10 ** IERC20Metadata(params.lpUsdc).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdc), "Some token not compatible");

        // get LP amount min
        uint256 usdcBalance = usdc.balanceOf(address(this));
        (uint256 lpUsdcAmount,) = poolDepositor.getDepositAmountOut(address(lpUsdc), usdcBalance);
        uint256 lpUsdcAmountMin = OvnMath.subBasisPoints(lpUsdcAmount, stakeSlippageBP);

        // deposit
        usdc.approve(address(poolDepositor), usdcBalance);
        poolDepositor.deposit(address(lpUsdc), usdcBalance, lpUsdcAmountMin, true);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // get withdraw amount for 1 LP
        (uint256 usdcAmountOneAsset,) = poolDepositor.getWithdrawAmountOut(address(lpUsdc), lpUsdcDm);

        // get LP amount
        uint256 lpUsdcAmount = OvnMath.addBasisPoints(_amount, stakeSlippageBP) * lpUsdcDm / usdcAmountOneAsset;

        // withdraw
        wmxLpUsdc.approve(address(poolDepositor), lpUsdcAmount);
        poolDepositor.withdraw(address(lpUsdc), lpUsdcAmount, _amount, address(this));

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // get usdc amount min
        uint256 lpUsdcBalance = wmxLpUsdc.balanceOf(address(this));
        if (lpUsdcBalance == 0) {
            return usdc.balanceOf(address(this));
        }
        (uint256 usdcAmount,) = poolDepositor.getWithdrawAmountOut(address(lpUsdc), lpUsdcBalance);
        uint256 usdcAmountMin = OvnMath.subBasisPoints(usdcAmount, stakeSlippageBP);

        // withdraw
        wmxLpUsdc.approve(address(poolDepositor), lpUsdcBalance);
        poolDepositor.withdraw(address(lpUsdc), lpUsdcBalance, usdcAmountMin, address(this));

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));

        uint256 lpUsdcBalance = wmxLpUsdc.balanceOf(address(this));
        if (lpUsdcBalance > 0) {
            (uint256 usdcAmount,) = poolDepositor.getWithdrawAmountOut(address(lpUsdc), lpUsdcBalance);
            usdcBalance += usdcAmount;
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 lpUsdcBalance = wmxLpUsdc.balanceOf(address(this));
        if (lpUsdcBalance > 0) {
            wmxLpUsdc.getReward(address(this), false);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 womBalance = wom.balanceOf(address(this));
        if (womBalance > 0) {
            uint256 amountOut = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(wom),
                address(busd),
                address(usdc),
                womBalance
            );

            if (amountOut > 0) {
                totalUsdc += PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(wom),
                    address(busd),
                    address(usdc),
                    womBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
            }
        }

        uint256 wmxBalance = wmx.balanceOf(address(this));
        if (wmxBalance > 0) {
            uint256 amountOut = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(wmx),
                address(busd),
                address(usdc),
                wmxBalance
            );

            if (amountOut > 0) {
                totalUsdc += PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(wmx),
                    address(busd),
                    address(usdc),
                    wmxBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
            }
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function sendLPTokens(address to, uint256 bps) external onlyAdmin {
        require(to != address(0), "Zero address not allowed");
        require(bps != 0, "Zero bps not allowed");

        uint256 assetAmount = wmxLpUsdc.balanceOf(address(this)) * bps / 10000;
        if (assetAmount > 0) {
            wmxLpUsdc.withdrawAndUnwrap(assetAmount, true);
            uint256 sendAmount = lpUsdc.balanceOf(address(this));
            if (sendAmount > 0) {
                lpUsdc.transfer(to, sendAmount);
            }
        }
    }
}
