// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

import "../StrategyWethUsdc.sol";

library WethUsdcLibrary {

    /**
     * ActionType: ADD_LIQUIDITY
     * Add liquidity to mesh pool:
     * [weth, usdc] -> mesh lpToken
     */
    function _addLiquidity(StrategyWethUsdc self, uint256 delta) public {
        if (self.weth().balanceOf(address(self)) == 0 || self.usdPlus().balanceOf(address(self)) == 0) {
            return;
        }
        uint256 usdcBalanceBefore = self.usdc().balanceOf(address(self));
        self.exchange().redeem(address(self.usdc()), self.usdPlus().balanceOf(address(self)) - (delta == self.MAX_UINT_VALUE() ? 0 : delta));
        uint256 usdcBalanceAfter = self.usdc().balanceOf(address(self));

        self.router().addLiquidity(
            address(self.weth()),
            address(self.usdc()),
            false,
            self.weth().balanceOf(address(self)),
            usdcBalanceAfter - usdcBalanceBefore,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 lpTokenBalance = self.pair().balanceOf(address(this));
        self.pair().approve(address(self.gauge()), lpTokenBalance);
        self.gauge().deposit(lpTokenBalance, 0);
    }

    /**
     * ActionType: REMOVE_LIQUIDITY
     * Remove liquidity from mesh pool:
     * mesh lpToken -> [weth, usdc]
     * @param delta - weth amount in USD e6
     */
    function _removeLiquidity(StrategyWethUsdc self, uint256 delta) public returns (uint256, uint256) {
        // calc weth tokens amount
        uint256 lpForUnstake = _getLpForUnstake(self, delta);

        self.pair().approve(address(self.router()), lpForUnstake);
        self.gauge().withdraw(lpForUnstake);

        uint256 usdcBalanceBefore = self.usdc().balanceOf(address(self));

        (uint256 amountWeth, uint256 amountUsdc) = self.router().removeLiquidity(
            address(self.weth()),
            address(self.usdc()),
            false,
            lpForUnstake,
            0,
            0,
            address(self),
            block.timestamp
        );

        uint256 usdPlusBalanceBefore = self.usdPlus().balanceOf(address(self));

        self.exchange().buy(address(self.usdc()), self.usdc().balanceOf(address(self)) - usdcBalanceBefore);

        return (amountWeth, self.usdPlus().balanceOf(address(self)) - usdPlusBalanceBefore);
    }

    function _getLpForUnstake(StrategyWethUsdc self, uint256 delta) internal view returns (uint256 lpForUnstake) {
        uint256 poolTokenDelta = self.control().usdToWeth(delta);
        uint256 lpTokenBalance = self.gauge().balanceOf(address(this));
        uint256 totalLpBalance = self.pair().totalSupply();
        (uint256 reserveWeth,,) = self.pair().getReserves();
        uint256 wethBalance = reserveWeth * lpTokenBalance / totalLpBalance;
        lpForUnstake = poolTokenDelta * lpTokenBalance / wethBalance;
    }

    /**
     * ActionType: SWAP_USDPLUS_TO_ASSET
     * Swap on exchange
     * usdPlus -> usdc
     * @param delta - UsdPlus in USD e6
     */
    function _swapUsdPlusToUsdc(StrategyWethUsdc self, uint256 delta) public {
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
    function _swapUsdcToUsdPlus(StrategyWethUsdc self, uint256 delta) public {
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
    function _supplyUsdcToAave(StrategyWethUsdc self, uint256 delta) public {
        uint256 supplyUsdcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdc().balanceOf(address(self)))
                ? self.usdc().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (supplyUsdcAmount == 0) {
            return;
        }
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
    function _withdrawUsdcFromAave(StrategyWethUsdc self, uint256 delta) public {
        uint256 withdrawUsdcAmount = self.control().usdToUsdc(delta);
        self.control().aavePool().withdraw(
            address(self.usdc()),
            withdrawUsdcAmount,
            address(self)
        );
    }

    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> weth
     * @param delta - Weth in USD e6
     */
    function _borrowWethFromAave(StrategyWethUsdc self, uint256 delta) public {
        uint256 borrowWethAmount = self.control().usdToWeth(delta);
        self.control().aavePool().borrow(
            address(self.weth()),
            borrowWethAmount,
            self.INTEREST_RATE_MODE(),
            self.REFERRAL_CODE(),
            address(self)
        );
    }

    /**
     * ActionType: REPAY_TOKEN_TO_AAVE
     * weth -> (back to aave)
     * @param delta - Weth in USD e6
     */
    function _repayWethToAave(StrategyWethUsdc self, uint256 delta) public {
        uint256 repayWethAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToWeth(delta) > self.weth().balanceOf(address(self)))
                ? self.weth().balanceOf(address(self))
                : self.control().usdToWeth(delta);
        if (repayWethAmount == 0) {
            return;
        }
        // aave pool may be changed, so we need always approve
        self.weth().approve(address(self.control().aavePool()), repayWethAmount);
        self.control().aavePool().repay(
            address(self.weth()),
            repayWethAmount,
            self.INTEREST_RATE_MODE(),
            address(self)
        );
    }

    /**
     * ActionType: SWAP_TOKEN_TO_ASSET
     * Swap on UniswapV3
     * weth -> usdc
     * @param delta - Weth in USD e6
     */
    function _swapWethToUsdc(StrategyWethUsdc self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapWethAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToWeth(delta) > self.weth().balanceOf(address(self)))
                ? self.weth().balanceOf(address(self))
                : self.control().usdToWeth(delta);
        if (swapWethAmount == 0) {
            return;
        }
        uint256 amountOutMin = self.control().usdToUsdc(self.control().wethToUsd(swapWethAmount / 10000 * (10000 - slippagePercent)));
        UniswapV3Library.singleSwap(
            self.uniswapV3Router(),
            address(self.weth()),
            address(self.usdc()),
            self.poolFee1(),
            address(self),
            swapWethAmount,
            amountOutMin
        );
    }

    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on UniswapV3
     * usdc -> weth
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToWeth(StrategyWethUsdc self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapUsdcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToUsdc(delta) > self.usdc().balanceOf(address(self)))
                ? self.usdc().balanceOf(address(self))
                : self.control().usdToUsdc(delta);
        if (swapUsdcAmount == 0) {
            return;
        }
        uint256 amountOutMin = self.control().usdToWeth(self.control().usdcToUsd(swapUsdcAmount / 10000 * (10000 - slippagePercent)));
        UniswapV3Library.singleSwap(
            self.uniswapV3Router(),
            address(self.usdc()),
            address(self.weth()),
            self.poolFee1(),
            address(self),
            swapUsdcAmount,
            amountOutMin
        );
    }

}
