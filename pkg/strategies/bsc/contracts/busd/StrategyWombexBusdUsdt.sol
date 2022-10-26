// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombex.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import {IWombatRouter, WombatLibrary} from '@overnight-contracts/connectors/contracts/stuff/Wombat.sol';

import "hardhat/console.sol";

contract StrategyWombexBusdUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address busdToken;
        address usdtToken;
        address womToken;
        address wmxToken;
        address lpUsdt;
        address wmxLpUsdt;
        address poolDepositor;
        address pancakeRouter;
        address wombatRouter;
    }

    // --- params

    IERC20 public busdToken;
    IERC20 public usdtToken;
    IERC20 public womToken;
    IERC20 public wmxToken;

    IAsset public lpUsdt;
    IBaseRewardPool public wmxLpUsdt;
    IPoolDepositor public poolDepositor;
    IPool public pool;

    IPancakeRouter02 public pancakeRouter;
    IWombatRouter public wombatRouter;

    uint256 public lpUsdtTokenDenominator;

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
        usdtToken = IERC20(params.usdtToken);
        womToken = IERC20(params.womToken);
        wmxToken = IERC20(params.wmxToken);

        lpUsdt = IAsset(params.lpUsdt);
        wmxLpUsdt = IBaseRewardPool(params.wmxLpUsdt);
        poolDepositor = IPoolDepositor(params.poolDepositor);
        pool = IPool(poolDepositor.pool());

        pancakeRouter = IPancakeRouter02(params.pancakeRouter);
        wombatRouter = IWombatRouter(params.wombatRouter);

        lpUsdtTokenDenominator = 10 ** IERC20Metadata(params.lpUsdt).decimals();

        usdtToken.approve(address(poolDepositor), type(uint256).max);
        wmxLpUsdt.approve(address(poolDepositor), type(uint256).max);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(busdToken), "Some token not compatible");

        console.log("usdtBalance before swap: %s", usdtToken.balanceOf(address(this)));
        // swap busd to usdt
        uint256 busdBalance = busdToken.balanceOf(address(this));
        uint256 usdtBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(busdToken),
            address(usdtToken),
            address(pool),
            busdBalance
        );
        if (usdtBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(busdToken),
                address(usdtToken),
                address(pool),
                busdBalance,
                OvnMath.subBasisPoints(usdtBalanceOut, 4),
                address(this)
            );
        }
        console.log("usdtBalance after swap: %s", busdToken.balanceOf(address(this)));

        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        console.log("usdtBalance before deposit: %s", usdtToken.balanceOf(address(this)));
        (uint256 lpUsdtAmount,) = pool.quotePotentialDeposit(address(usdtToken), usdtBalance);
        poolDepositor.deposit(address(lpUsdt), usdtBalance, OvnMath.subBasisPoints(lpUsdtAmount, 1), true);
        console.log("usdtBalance after deposit: %s", usdtToken.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busdToken), "Some token not compatible");

        // calculate swap _amount usdt to busd
        uint256 busdAmountForUsdtAmount = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdtToken),
            address(busdToken),
            address(pool),
            _amount
        );
        // get usdtAmount for _amount in busd
        uint256 usdtAmount = _amount * _amount / busdAmountForUsdtAmount;
        // get amount to unstake
        (uint256 usdtAmountOneAsset,) = pool.quotePotentialWithdraw(address(usdtToken), lpUsdtTokenDenominator);
        // add 1bp for smooth withdraw
        uint256 lpUsdtAmount = OvnMath.addBasisPoints(usdtAmount, 1) * lpUsdtTokenDenominator / usdtAmountOneAsset;
        console.log("lpUsdtAmount: %s", lpUsdtAmount);

        console.log("usdtBalance before withdraw: %s", usdtToken.balanceOf(address(this)));
        poolDepositor.withdraw(address(lpUsdt), lpUsdtAmount, _amount);
        console.log("usdtBalance after withdraw: %s", usdtToken.balanceOf(address(this)));

        // swap usdt to busd
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        uint256 busdBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdtToken),
            address(busdToken),
            address(pool),
            usdtBalance
        );
        if (busdBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdtToken),
                address(busdToken),
                address(pool),
                usdtBalance,
                OvnMath.subBasisPoints(busdBalanceOut, 4),
                address(this)
            );
        }

        console.log("usdtBalance after swap: %s", usdtToken.balanceOf(address(this)));
        console.log("busdToken after swap: %s", busdToken.balanceOf(address(this)));
        return busdToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busdToken), "Some token not compatible");

        console.log("usdtBalance before withdraw: %s", usdtToken.balanceOf(address(this)));
        uint256 lpUsdtBalance = wmxLpUsdt.balanceOf(address(this));
        console.log("lpUsdtBalance before withdraw: %s", lpUsdtBalance);
        if (lpUsdtBalance > 0) {
            (uint256 usdtAmount,) = pool.quotePotentialWithdraw(address(usdtToken), lpUsdtBalance);
            poolDepositor.withdraw(address(lpUsdt), lpUsdtBalance, OvnMath.subBasisPoints(usdtAmount, 1));
        }
        console.log("lpUsdtBalance after withdraw: %s", wmxLpUsdt.balanceOf(address(this)));
        console.log("usdtBalance after withdraw: %s", usdtToken.balanceOf(address(this)));

        // swap usdt to busd
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        uint256 busdBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdtToken),
            address(busdToken),
            address(pool),
            usdtBalance
        );
        if (busdBalanceOut > 0) {
            WombatLibrary.swapExactTokensForTokens(
                wombatRouter,
                address(usdtToken),
                address(busdToken),
                address(pool),
                usdtBalance,
                OvnMath.subBasisPoints(busdBalanceOut, 4),
                address(this)
            );
        }

        console.log("usdtBalance after swap: %s", usdtToken.balanceOf(address(this)));
        console.log("busdToken after swap: %s", busdToken.balanceOf(address(this)));
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
        uint256 usdtBalance = usdtToken.balanceOf(address(this));

        uint256 wmxLpUsdtBalance = wmxLpUsdt.balanceOf(address(this));
        if (wmxLpUsdtBalance > 0) {
            if (nav) {
                (uint256 usdtAmountOneAsset,) = pool.quotePotentialWithdraw(address(usdtToken), lpUsdtTokenDenominator);
                usdtBalance += wmxLpUsdtBalance * usdtAmountOneAsset / lpUsdtTokenDenominator;
            } else {
                (uint256 usdtAmount,) = pool.quotePotentialWithdraw(address(usdtToken), wmxLpUsdtBalance);
                usdtBalance += usdtAmount;
            }
        }

        if (usdtBalance > 0) {
            busdBalance += WombatLibrary.getAmountOut(
                wombatRouter,
                address(usdtToken),
                address(busdToken),
                address(pool),
                usdtBalance
            );
        }

        if (nav) {
            console.log("nav: %s", busdBalance);
        } else {
            console.log("liq: %s", busdBalance);
        }
        return busdBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 lpUsdtBalance = wmxLpUsdt.balanceOf(address(this));
        console.log("lpUsdtBalance: %s", lpUsdtBalance);
        if (lpUsdtBalance > 0) {
            wmxLpUsdt.getReward(address(this), false);
        }

        // sell rewards
        uint256 totalBusd;

        uint256 womBalance = womToken.balanceOf(address(this));
        console.log("womBalance: %s", womBalance);
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
                console.log("womBusd: %s", womBusd);

                totalBusd += womBusd;
            }
        }

        uint256 wmxBalance = wmxToken.balanceOf(address(this));
        console.log("wmxBalance: %s", wmxBalance);
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
                console.log("wmxBusd: %s", wmxBusd);

                totalBusd += wmxBusd;
            }
        }

        if (totalBusd > 0) {
            busdToken.transfer(_to, totalBusd);
        }

        console.log("totalBusd: %s", totalBusd);
        return totalBusd;
    }

}
