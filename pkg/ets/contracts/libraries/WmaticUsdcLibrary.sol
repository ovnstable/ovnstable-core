// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

import "../StrategyWmaticUsdc.sol";

import "hardhat/console.sol";

library WmaticUsdcLibrary {

    /**
     * ActionType: ADD_LIQUIDITY
     * Add liquidity to mesh pool:
     * [wmatic, usdc] -> mesh lpToken
     */
    function _addLiquidity(StrategyWmaticUsdc self, uint256 delta) public {
        if (self.wmatic().balanceOf(address(self)) == 0 || self.usdPlus().balanceOf(address(self)) == 0) {
            return;
        }
        console.log("delta ", delta);
        console.log("self.usdPlus().balanceOf(address(self)) ", self.usdPlus().balanceOf(address(self)));
        uint256 usdcBalanceBefore = self.usdc().balanceOf(address(self));
        console.log("usdcBalanceBefore ", usdcBalanceBefore);
        self.exchange().redeem(address(self.usdc()), self.usdPlus().balanceOf(address(self)) - (delta == self.MAX_UINT_VALUE() ? 0 : delta));
        uint256 usdcBalanceAfter = self.usdc().balanceOf(address(self));
        console.log("usdcBalanceAfter ", usdcBalanceAfter);
        console.log("usdcBalanceAfter - usdcBalanceBefore ", usdcBalanceAfter - usdcBalanceBefore);
        console.log("self.wmatic().balanceOf(address(self)) ", self.wmatic().balanceOf(address(self)));

        self.meshSwapRouter().addLiquidity(
            address(self.wmatic()),
            address(self.usdc()),
            self.wmatic().balanceOf(address(self)),
            usdcBalanceAfter - usdcBalanceBefore,
            0,
            0,
            address(self),
            block.timestamp
        );
        console.log("self.wmatic().balanceOf(address(self)) after ", self.wmatic().balanceOf(address(self)));
        console.log("self.usdc().balanceOf(address(self)) after ", self.usdc().balanceOf(address(self)));
    }

    /**
     * ActionType: REMOVE_LIQUIDITY
     * Remove liquidity from mesh pool:
     * mesh lpToken -> [wmatic, usdc]
     * @param delta - wmatic amount in USD e6
     */
    function _removeLiquidity(StrategyWmaticUsdc self, uint256 delta) public returns (uint256, uint256) {
        // calc wmatic tokens amount
        uint256 lpForUnstake = _getLpForUnstake(self, delta);
        console.log("lpForUnstake ", lpForUnstake);

        uint256 usdcBalanceBefore = self.usdc().balanceOf(address(self));
        console.log("usdcBalanceBefore ", usdcBalanceBefore);

        (uint256 amountWmatic, uint256 amountUsdc) = self.meshSwapRouter().removeLiquidity(
            address(self.wmatic()),
            address(self.usdc()),
            lpForUnstake,
            0,
            0,
            address(self),
            block.timestamp
        );
        console.log("amountUsdc ", amountUsdc);
        console.log("amountWmatic ", amountWmatic);
        console.log("amountWmatic in usd ", self.control().wmaticToUsd(amountWmatic));
        console.log("delta ", delta);

        uint256 usdPlusBalanceBefore = self.usdPlus().balanceOf(address(self));
        console.log("usdPlusBalanceBefore ", usdPlusBalanceBefore);

        console.log("self.usdc().balanceOf(address(self)) - usdcBalanceBefore ", self.usdc().balanceOf(address(self)) - usdcBalanceBefore);
        self.exchange().buy(address(self.usdc()), self.usdc().balanceOf(address(self)) - usdcBalanceBefore);

        console.log("self.usdPlus().balanceOf(address(self)) - usdPlusBalanceBefore ", self.usdPlus().balanceOf(address(self)) - usdPlusBalanceBefore);
        return (amountWmatic, self.usdPlus().balanceOf(address(self)) - usdPlusBalanceBefore);
    }

    function _getLpForUnstake(StrategyWmaticUsdc self, uint256 delta) internal view returns (uint256 lpForUnstake) {
        uint256 poolTokenDelta = self.control().usdToWmatic(delta);
        uint256 lpTokenBalance = self.meshSwapWmaticUsdc().balanceOf(address(self));
        uint256 totalLpBalance = self.meshSwapWmaticUsdc().totalSupply();
        uint256 reserveWmatic = uint256(self.meshSwapWmaticUsdc().reserve0());
        uint256 wmaticBalance = reserveWmatic * lpTokenBalance / totalLpBalance;

        lpForUnstake = poolTokenDelta * lpTokenBalance / wmaticBalance + 1e12;
    }

    /**
     * ActionType: SWAP_USDPLUS_TO_ASSET
     * Swap on exchange
     * usdPlus -> usdc
     * @param delta - UsdPlus in USD e6
     */
    function _swapUsdPlusToUsdc(StrategyWmaticUsdc self, uint256 delta) public {
        uint256 redeemUsdPlusAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdPlus().balanceOf(address(self)))
                ? self.usdPlus().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (redeemUsdPlusAmount == 0) return;
        self.exchange().redeem(address(self.usdc()), redeemUsdPlusAmount);
    }

    /**
     * ActionType: SWAP_ASSET_TO_USDPLUS
     * Swap on exchange
     * usdc -> usdPlus
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToUsdPlus(StrategyWmaticUsdc self, uint256 delta) public {
        uint256 buyUsdcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdc().balanceOf(address(self)))
                ? self.usdc().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        console.log("self.usdc().balanceOf(address(self)) ", self.usdc().balanceOf(address(self)));
//        console.log("self.control().usdToUsdc(delta) ", self.control().usdToUsdc(delta));
        console.log("buyUsdcAmount ", buyUsdcAmount);
        if (buyUsdcAmount == 0) return;
        uint256 buyAmount = self.exchange().buy(address(self.usdc()), buyUsdcAmount);
        console.log("buyAmount ", buyAmount);
    }

    /**
     * ActionType: SUPPLY_ASSET_TO_AAVE
     * usdc -> (supply aave)
     * @param delta - Usdc in USD e6
     */
    function _supplyUsdcToAave(StrategyWmaticUsdc self, uint256 delta) public {
        uint256 supplyUsdcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdc().balanceOf(address(self)))
                ? self.usdc().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (supplyUsdcAmount == 0) return;
        // aave pool may be changed, so we need always approve
        self.usdc().approve(address(self.control().aavePool()), supplyUsdcAmount);
        self.control().aavePool().supply(
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
    function _withdrawUsdcFromAave(StrategyWmaticUsdc self, uint256 delta) public {
        uint256 withdrawUsdcAmount = self.control().usdToUsdc(delta);
        console.log("delta ", delta);
        console.log("withdrawUsdcAmount ", withdrawUsdcAmount);
        uint256 withdrawed = self.control().aavePool().withdraw(
            address(self.usdc()),
            withdrawUsdcAmount,
            address(self)
        );
        console.log("withdrawed ", withdrawed);
    }

    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> wmatic
     * @param delta - Wmatic in USD e6
     */
    function _borrowWmaticFromAave(StrategyWmaticUsdc self, uint256 delta) public {
        uint256 borrowWmaticAmount = self.control().usdToWmatic(delta);
        self.control().aavePool().borrow(
            address(self.wmatic()),
            borrowWmaticAmount,
            self.INTEREST_RATE_MODE(),
            self.REFERRAL_CODE(),
            address(self)
        );
    }

    /**
     * ActionType: REPAY_TOKEN_TO_AAVE
     * wmatic -> (back to aave)
     * @param delta - Wmatic in USD e6
     */
    function _repayWmaticToAave(StrategyWmaticUsdc self, uint256 delta) public {
        uint256 repayWmaticAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToWmatic(delta) > self.wmatic().balanceOf(address(self)))
                ? self.wmatic().balanceOf(address(self))
                : self.control().usdToWmatic(delta);
        console.log("self.wmatic().balanceOf(address(self)) ", self.wmatic().balanceOf(address(self)));
//        console.log("self.control().usdToWmatic(delta) ", self.control().usdToWmatic(delta));
        console.log("repayWmaticAmount ", repayWmaticAmount);
        if (repayWmaticAmount == 0) return;
        // aave pool may be changed, so we need always approve
        self.wmatic().approve(address(self.control().aavePool()), repayWmaticAmount);
        uint256 repayed = self.control().aavePool().repay(
            address(self.wmatic()),
            repayWmaticAmount,
            self.INTEREST_RATE_MODE(),
            address(self)
        );
        console.log("repayed ", repayed);
    }

    /**
     * ActionType: SWAP_TOKEN_TO_ASSET
     * Swap on UniswapV3
     * wmatic -> usdc
     * @param delta - Wmatic in USD e6
     */
    function _swapWmaticToUsdc(StrategyWmaticUsdc self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapWmaticAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToWmatic(delta) > self.wmatic().balanceOf(address(self)))
                ? self.wmatic().balanceOf(address(self))
                : self.control().usdToWmatic(delta);
        if (swapWmaticAmount == 0) return;
        uint256 amountOutMin = self.control().usdToUsdc(self.control().wmaticToUsd(swapWmaticAmount / 10000 * (10000 - slippagePercent)));
        UniswapV3Library.singleSwap(
            self.uniswapV3Router(),
            address(self.wmatic()),
            address(self.usdc()),
            self.poolFeeMaticUsdc(),
            address(self),
            swapWmaticAmount,
            amountOutMin
        );
    }

    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on UniswapV3
     * usdc -> wmatic
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToWmatic(StrategyWmaticUsdc self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapUsdcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdc().balanceOf(address(self)))
                ? self.usdc().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (swapUsdcAmount == 0) return;
        uint256 amountOutMin = self.control().usdToWmatic(self.control().usdcToUsd(swapUsdcAmount / 10000 * (10000 - slippagePercent)));
        UniswapV3Library.singleSwap(
            self.uniswapV3Router(),
            address(self.usdc()),
            address(self.wmatic()),
            self.poolFeeMaticUsdc(),
            address(self),
            swapUsdcAmount,
            amountOutMin
        );
    }

}
