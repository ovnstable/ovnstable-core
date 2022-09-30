// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

import "../StrategyOpUsdc.sol";

import "hardhat/console.sol";

library OpUsdcLibrary {

    /**
     * ActionType: ADD_LIQUIDITY
     * Add liquidity to mesh pool:
     * [op, usdc] -> mesh lpToken
     */
    function _addLiquidity(StrategyOpUsdc self, uint256 delta) public {
        if (self.op().balanceOf(address(self)) == 0 || self.usdPlus().balanceOf(address(self)) == 0) {
            return;
        }
        uint256 usdcBalanceBefore = self.usdc().balanceOf(address(self));

        uint256 usdPlusBalance = self.usdPlus().balanceOf(address(self)) - (delta == self.MAX_UINT_VALUE() ? 0 : delta);
        if (usdPlusBalance > 0) {
            self.exchange().redeem(address(self.usdc()), usdPlusBalance);
        }

        uint256 usdcBalance = self.usdc().balanceOf(address(self)) - usdcBalanceBefore;
        if (usdcBalance == 0) {
            return;
        }

        self.router().addLiquidity(
            address(self.op()),
            address(self.usdc()),
            false,
            self.op().balanceOf(address(self)),
            usdcBalance,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 lpTokenBalance = self.pair().balanceOf(address(this));
        self.gauge().deposit(lpTokenBalance, 0);
    }

    /**
     * ActionType: REMOVE_LIQUIDITY
     * Remove liquidity from mesh pool:
     * mesh lpToken -> [op, usdc]
     * @param delta - op amount in USD e6
     */
    function _removeLiquidity(StrategyOpUsdc self, uint256 delta) public returns (uint256, uint256) {
        if (delta == 0) {
            return (0, 0);
        }
        // calc op tokens amount
        uint256 lpForUnstake = _getLpForUnstake(self, delta);
        if (lpForUnstake == 0) {
            return (0, 0);
        }
        self.gauge().withdraw(lpForUnstake);

        uint256 usdcBalanceBefore = self.usdc().balanceOf(address(self));

        (uint256 amountOp, uint256 amountUsdc) = self.router().removeLiquidity(
            address(self.op()),
            address(self.usdc()),
            false,
            lpForUnstake,
            0,
            0,
            address(self),
            block.timestamp
        );

        uint256 usdPlusBalanceBefore = self.usdPlus().balanceOf(address(self));

        uint256 usdcBalance = self.usdc().balanceOf(address(self)) - usdcBalanceBefore;
        if (usdcBalance > 0) {
            self.exchange().buy(address(self.usdc()), usdcBalance);
        }

        return (amountOp, self.usdPlus().balanceOf(address(self)) - usdPlusBalanceBefore);
    }

    function _getLpForUnstake(StrategyOpUsdc self, uint256 delta) internal view returns (uint256 lpForUnstake) {
        uint256 poolTokenDelta = self.control().usdToOp(delta);
        uint256 lpTokenBalance = self.gauge().balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = self.pair().totalSupply();
            (uint256 reserveOp,,) = self.pair().getReserves();
            uint256 opBalance = reserveOp * lpTokenBalance / totalLpBalance;
            lpForUnstake = poolTokenDelta * lpTokenBalance / opBalance;
            if (lpForUnstake > lpTokenBalance) {
                lpForUnstake = lpTokenBalance;
            }
        }
    }

    /**
     * ActionType: SWAP_USDPLUS_TO_ASSET
     * Swap on exchange
     * usdPlus -> usdc
     * @param delta - UsdPlus in USD e6
     */
    function _swapUsdPlusToUsdc(StrategyOpUsdc self, uint256 delta) public {
        uint256 redeemUsdPlusAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdPlus().balanceOf(address(self)))
                ? self.usdPlus().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (redeemUsdPlusAmount == 0) {
            return;
        }
        self.exchange().redeem(address(self.usdc()), redeemUsdPlusAmount);
    }

    /**
     * ActionType: SWAP_ASSET_TO_USDPLUS
     * Swap on exchange
     * usdc -> usdPlus
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToUsdPlus(StrategyOpUsdc self, uint256 delta) public {
        uint256 buyUsdcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdc().balanceOf(address(self)))
                ? self.usdc().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (buyUsdcAmount == 0) {
            return;
        }
        self.exchange().buy(address(self.usdc()), buyUsdcAmount);
    }

    /**
     * ActionType: SUPPLY_ASSET_TO_AAVE
     * usdc -> (supply aave)
     * @param delta - Usdc in USD e6
     */
    function _supplyUsdcToAave(StrategyOpUsdc self, uint256 delta) public {
        uint256 supplyUsdcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdc().balanceOf(address(self)))
                ? self.usdc().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (supplyUsdcAmount == 0) {
            return;
        }
        // aave pool may be changed, so we need always approve
        self.usdc().approve(address(self.control().aavePool()), supplyUsdcAmount);
        self.control().aavePool().deposit(
            address(self.usdc()),
            supplyUsdcAmount,
            address(self),
            self.REFERRAL_CODE()
        );
    }

    /**
     * ActionType: WITHDRAW_ASSET_FROM_AAVE
     * (aave) -> usdc
     * @param delta - Usdc in USD e6
     */
    function _withdrawUsdcFromAave(StrategyOpUsdc self, uint256 delta) public {
        uint256 withdrawUsdcAmount = self.control().usdToUsdc(delta);
        self.control().aavePool().withdraw(
            address(self.usdc()),
            withdrawUsdcAmount,
            address(self)
        );
    }

    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> op
     * @param delta - Op in USD e6
     */
    function _borrowOpFromAave(StrategyOpUsdc self, uint256 delta) public {
        uint256 borrowOpAmount = self.control().usdToOp(delta);
        self.control().aavePool().borrow(
            address(self.op()),
            borrowOpAmount,
            self.INTEREST_RATE_MODE(),
            self.REFERRAL_CODE(),
            address(self)
        );
    }

    /**
     * ActionType: REPAY_TOKEN_TO_AAVE
     * op -> (back to aave)
     * @param delta - Op in USD e6
     */
    function _repayOpToAave(StrategyOpUsdc self, uint256 delta) public {
        uint256 repayOpAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToOp(delta) > self.op().balanceOf(address(self)))
                ? self.op().balanceOf(address(self))
                : self.control().usdToOp(delta);
        if (repayOpAmount == 0) {
            return;
        }
        // aave pool may be changed, so we need always approve
        self.op().approve(address(self.control().aavePool()), repayOpAmount);
        self.control().aavePool().repay(
            address(self.op()),
            repayOpAmount,
            self.INTEREST_RATE_MODE(),
            address(self)
        );
    }

    /**
     * ActionType: SWAP_TOKEN_TO_ASSET
     * Swap on UniswapV3
     * op -> usdc
     * @param delta - Op in USD e6
     */
    function _swapOpToUsdc(StrategyOpUsdc self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapOpAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToOp(delta) > self.op().balanceOf(address(self)))
                ? self.op().balanceOf(address(self))
                : self.control().usdToOp(delta);
        if (swapOpAmount == 0) {
            return;
        }

        uint256 amountOutMin = self.control().usdToUsdc(self.control().opToUsd(swapOpAmount / 10000 * (10000 - slippagePercent)));
        if (amountOutMin == 0) {
            return;
        }

        // if amount < 100 op use singleSwap op -> usdc
        // else use multiSwap op -> weth -> usdc
        if (swapOpAmount < 1e20) {
            UniswapV3Library.singleSwap(
                self.uniswapV3Router(),
                address(self.op()),
                address(self.usdc()),
                self.poolFeeOpUsdc(),
                address(self),
                swapOpAmount,
                amountOutMin
            );
        } else {
            UniswapV3Library.multiSwap(
                self.uniswapV3Router(),
                address(self.op()),
                address(self.weth()),
                address(self.usdc()),
                self.poolFeeOpWeth(),
                self.poolFeeWethUsdc(),
                address(self),
                swapOpAmount,
                amountOutMin
            );
        }
    }

    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on UniswapV3
     * usdc -> op
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToOp(StrategyOpUsdc self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapUsdcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdc().balanceOf(address(self)))
                ? self.usdc().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (swapUsdcAmount == 0) {
            return;
        }

        uint256 amountOutMin = self.control().usdToOp(self.control().usdcToUsd(swapUsdcAmount / 10000 * (10000 - slippagePercent)));
        if (amountOutMin == 0) {
            return;
        }

        // if amount < 100 usdc use singleSwap usdc -> op
        // else use multiSwap usdc -> weth -> op
        if (swapUsdcAmount < 1e8) {
            UniswapV3Library.singleSwap(
                self.uniswapV3Router(),
                address(self.usdc()),
                address(self.op()),
                self.poolFeeOpUsdc(),
                address(self),
                swapUsdcAmount,
                amountOutMin
            );
        } else {
            UniswapV3Library.multiSwap(
                self.uniswapV3Router(),
                address(self.usdc()),
                address(self.weth()),
                address(self.op()),
                self.poolFeeWethUsdc(),
                self.poolFeeOpWeth(),
                address(self),
                swapUsdcAmount,
                amountOutMin
            );
        }
    }

}
