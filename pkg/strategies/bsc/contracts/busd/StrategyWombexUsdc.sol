// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import {IWombatRouter, WombatLibrary} from '@overnight-contracts/connectors/contracts/stuff/Wombat.sol';


contract StrategyWombexUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address busdToken;
        address usdcToken;
        address womToken;
        address wmxToken;
        address lpUsdc;
        address wmxLpUsdc;
        address poolDepositor;
        address pancakeRouter;
        address wombatRouter;
    }

    // --- params

    IERC20 public busdToken;
    IERC20 public usdcToken;
    IERC20 public womToken;
    IERC20 public wmxToken;

    IAsset public lpUsdc;
    IBaseRewardPool public wmxLpUsdc;
    IPoolDepositor public poolDepositor;
    IPool public pool;

    IPancakeRouter02 public pancakeRouter;
    IWombatRouter public wombatRouter;

    uint256 public lpUsdcTokenDenominator;

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
        busdToken = IERC20(params.busdToken);
        usdcToken = IERC20(params.usdcToken);
        womToken = IERC20(params.womToken);
        wmxToken = IERC20(params.wmxToken);

        lpUsdc = IAsset(params.lpUsdc);
        wmxLpUsdc = IBaseRewardPool(params.wmxLpUsdc);
        poolDepositor = IPoolDepositor(params.poolDepositor);
        pool = IPool(poolDepositor.pool());

        pancakeRouter = IPancakeRouter02(params.pancakeRouter);
        wombatRouter = IWombatRouter(params.wombatRouter);

        lpUsdcTokenDenominator = 10 ** IERC20Metadata(params.lpUsdc).decimals();

        usdcToken.approve(address(poolDepositor), type(uint256).max);
        wmxLpUsdc.approve(address(poolDepositor), type(uint256).max);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(busdToken), "Some token not compatible");

        // swap busd to usdc
        uint256 busdBalance = busdToken.balanceOf(address(this));
        uint256 usdcBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(busdToken),
            address(usdcToken),
            address(pool),
            busdBalance
        );
        if (usdcBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(busdToken),
                address(usdcToken),
                address(pool),
                busdBalance,
                OvnMath.subBasisPoints(usdcBalanceOut, 4),
                address(this)
            );
        }

        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        (uint256 lpUsdcAmount,) = pool.quotePotentialDeposit(address(usdcToken), usdcBalance);
        poolDepositor.deposit(address(lpUsdc), usdcBalance, OvnMath.subBasisPoints(lpUsdcAmount, 1), true);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busdToken), "Some token not compatible");

        // calculate swap _amount usdc to busd
        uint256 busdAmountForUsdcAmount = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdcToken),
            address(busdToken),
            address(pool),
            _amount
        );
        // get usdcAmount for _amount in busd
        uint256 usdcAmount = _amount * _amount / busdAmountForUsdcAmount;
        // get amount to unstake
        (uint256 usdcAmountOneAsset,) = pool.quotePotentialWithdraw(address(usdcToken), lpUsdcTokenDenominator);
        // add 1bp for smooth withdraw
        uint256 lpUsdcAmount = OvnMath.addBasisPoints(usdcAmount, 1) * lpUsdcTokenDenominator / usdcAmountOneAsset;

        poolDepositor.withdraw(address(lpUsdc), lpUsdcAmount, _amount);

        // swap usdc to busd
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 busdBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdcToken),
            address(busdToken),
            address(pool),
            usdcBalance
        );
        if (busdBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdcToken),
                address(busdToken),
                address(pool),
                usdcBalance,
                OvnMath.subBasisPoints(busdBalanceOut, 4),
                address(this)
            );
        }

        return busdToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busdToken), "Some token not compatible");

        uint256 lpUsdcBalance = wmxLpUsdc.balanceOf(address(this));
        if (lpUsdcBalance > 0) {
            (uint256 usdcAmount,) = pool.quotePotentialWithdraw(address(usdcToken), lpUsdcBalance);
            poolDepositor.withdraw(address(lpUsdc), lpUsdcBalance, OvnMath.subBasisPoints(usdcAmount, 1));
        }

        // swap usdc to busd
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 busdBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdcToken),
            address(busdToken),
            address(pool),
            usdcBalance
        );
        if (busdBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdcToken),
                address(busdToken),
                address(pool),
                usdcBalance,
                OvnMath.subBasisPoints(busdBalanceOut, 4),
                address(this)
            );
        }

        return busdToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 busdBalance = busdToken.balanceOf(address(this));
        uint256 usdcBalance = usdcToken.balanceOf(address(this));

        uint256 wmxLpUsdcBalance = wmxLpUsdc.balanceOf(address(this));
        if (wmxLpUsdcBalance > 0) {
            if (nav) {
                (uint256 usdcAmountOneAsset,) = pool.quotePotentialWithdraw(address(usdcToken), lpUsdcTokenDenominator);
                usdcBalance += wmxLpUsdcBalance * usdcAmountOneAsset / lpUsdcTokenDenominator;
            } else {
                (uint256 usdcAmount,) = pool.quotePotentialWithdraw(address(usdcToken), wmxLpUsdcBalance);
                usdcBalance += usdcAmount;
            }
        }

        if (usdcBalance > 0) {
            busdBalance += WombatLibrary.getAmountOut(
                wombatRouter,
                address(usdcToken),
                address(busdToken),
                address(pool),
                usdcBalance
            );
        }

        return busdBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 lpUsdcBalance = wmxLpUsdc.balanceOf(address(this));
        if (lpUsdcBalance > 0) {
            wmxLpUsdc.getReward(address(this), false);
        }

        // sell rewards
        uint256 totalBusd;

        uint256 womBalance = womToken.balanceOf(address(this));
        if (womBalance > 0) {
            uint256 amountOut = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(womToken),
                address(busdToken),
                womBalance
            );

            if (amountOut > 0) {
                uint256 womBusd = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(womToken),
                    address(busdToken),
                    womBalance,
                    amountOut * 99 / 100,
                    address(this)
                );

                totalBusd += womBusd;
            }
        }

        uint256 wmxBalance = wmxToken.balanceOf(address(this));
        if (wmxBalance > 0) {
            uint256 amountOut = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(wmxToken),
                address(busdToken),
                wmxBalance
            );

            if (amountOut > 0) {
                uint256 wmxBusd = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(wmxToken),
                    address(busdToken),
                    wmxBalance,
                    amountOut * 99 / 100,
                    address(this)
                );

                totalBusd += wmxBusd;
            }
        }

        if (totalBusd > 0) {
            busdToken.transfer(_to, totalBusd);
        }

        return totalBusd;
    }

}
