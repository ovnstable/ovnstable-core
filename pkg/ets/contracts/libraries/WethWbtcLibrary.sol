// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Beethovenx.sol";

import "../StrategyWethWbtc.sol";

import "hardhat/console.sol";

library WethWbtcLibrary {

    /**
     * ActionType: ADD_LIQUIDITY
     * Add liquidity to mesh pool:
     * [weth, wbtc] -> mesh lpToken
     */
    function _addLiquidity(StrategyWethWbtc self, uint256 delta) public {
        if (self.weth().balanceOf(address(self)) == 0 || self.wbtc().balanceOf(address(self)) == 0) {
            return;
        }

        console.log("amountWeth", self.weth().balanceOf(address(self)));
        console.log("amountWbtc", self.wbtc().balanceOf(address(self)));
        uint256 amountWeth = self.weth().balanceOf(address(self));
        uint256 amountWbtc = self.wbtc().balanceOf(address(self)) - (delta == self.MAX_UINT_VALUE() ? 0 : self.control().usdToWbtc(delta));

        if (self.tokenId() == 0) {
            // console.log("mint");
            // create NFT in UniswapV3
            uint256 newTokenId = _mint(self, amountWeth, amountWbtc);
            self.setTokenId(newTokenId);
        } else {
            //  console.log("_addPartLiquidity()");
            _addPartLiquidity(self, amountWeth, amountWbtc);
        }
    }

    function _mint(StrategyWethWbtc self, uint256 amountWeth, uint256 amountWbtc) public returns (uint256) {
        // console.log("Start");

        self.weth().approve(address(self.nonfungiblePositionManager()), amountWeth);
        self.wbtc().approve(address(self.nonfungiblePositionManager()), amountWbtc);

        // console.log("amountWeth", amountWeth);
        // console.log("amountWbtc", amountWbtc);

        INonfungiblePositionManager.MintParams memory params =
            INonfungiblePositionManager.MintParams({
                token0: address(self.weth()),
                token1: address(self.wbtc()),
                fee: self.poolFee0(),
                tickLower: self.lowerTick(),
                tickUpper: self.upperTick(),
                amount0Desired: amountWeth,
                amount1Desired: amountWbtc,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp + 600
            });

        console.log("self.lowerTick()", uint24(-self.lowerTick()));
        console.log("self.upperTick()", uint24(-self.upperTick()));
        console.log("amountWeth", amountWeth);
        console.log("amountWbtc", amountWbtc);

        (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) = self.nonfungiblePositionManager().mint(params);

        // console.log("tokenId", tokenId);
        // console.log("liquidity", liquidity);
        // console.log("amount0 (weth)", amount0);
        // console.log("amount1 (wbtc)", amount1);

        // console.log("remain weth", self.weth().balanceOf(address(self)));
        // console.log("remain wbtc", self.wbtc().balanceOf(address(self)));


        // console.log("Finish");
        return tokenId;
    }

    function _addPartLiquidity(StrategyWethWbtc self, uint256 amountWeth, uint256 amountWbtc) public {

        if (self.control().wethToUsd(amountWeth) < 10 ** 4 || self.control().wbtcToUsd(amountWbtc) < 10 ** 4) {
            return;
        }

        self.weth().approve(address(self.nonfungiblePositionManager()), amountWeth);
        self.wbtc().approve(address(self.nonfungiblePositionManager()), amountWbtc);

        INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams(
            self.tokenId(),
            amountWeth,
            amountWbtc,
            0,
            0,
            block.timestamp + 600
        );

        // console.log("1", amountWeth);
        // console.log("2", amountWbtc);
        // console.log("1", self.control().wethToUsd(amountWeth));
        // console.log("2", self.control().wbtcToUsd(amountWbtc));

        (uint128 liquidity, uint256 amount0, uint256 amount1) = self.nonfungiblePositionManager().increaseLiquidity(params);
    }

    /**
     * ActionType: REMOVE_LIQUIDITY
     * Remove liquidity from mesh pool:
     * mesh lpToken -> [weth, wbtc]
     * @param delta - weth amount in USD e6
     */
    function _removeLiquidity(StrategyWethWbtc self, uint256 delta) public returns (uint256, uint256) {

        // console.log("_removeLiquidity");
        // uint256 usdtAmount = 0;//_getNeedToByUsdt(_amount);
        // uint256 usdcAmount = 0;//_amount - usdtAmount;

        (uint160 sqrtPriceX96,,,,,,) = self.pool().slot0();
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96, 
            TickMath.getSqrtRatioAtTick(self.lowerTick()), 
            TickMath.getSqrtRatioAtTick(self.upperTick()), 
            self.control().usdToWeth(delta), 
            1000000000000
        );
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams(
            self.tokenId(),
            liquidity,
            0,
            0,
            block.timestamp + 600
        );

        // console.log("2", self.control().usdToWeth(delta));
        // console.log("2", self.control().wbtcToUsd(self.control().usdToWeth(delta)));


        // console.log("real", self.weth().balanceOf(address(self)));
        (uint256 amount0, uint256 amount1) = self.nonfungiblePositionManager().decreaseLiquidity(params);
        // console.log("amount0", amount0);
        // console.log("amount1", amount1);
        INonfungiblePositionManager.CollectParams memory collectParam = INonfungiblePositionManager.CollectParams(self.tokenId(), address(this), type(uint128).max, type(uint128).max);
        self.nonfungiblePositionManager().collect(collectParam);
        // console.log("real", self.weth().balanceOf(address(self)));

        //todo
        // _collectLiquidityAndSwap();

        return (amount0, amount1);
    }

    // function _getLpForUnstake(StrategyWethWbtc self, uint256 delta) internal view returns (uint256 lpForUnstake) {
    //     uint256 poolTokenDelta = self.control().usdToWeth(delta);
    //     uint256 lpTokenBalance = self.gauge().balanceOf(address(this));
    //     if (lpTokenBalance > 0) {
    //         uint256 totalLpBalance = self.pair().totalSupply();
    //         (uint256 reserveWeth,,) = self.pair().getReserves();
    //         uint256 wethBalance = reserveWeth * lpTokenBalance / totalLpBalance;
    //         lpForUnstake = poolTokenDelta * lpTokenBalance / wethBalance;
    //         if (lpForUnstake > lpTokenBalance) {
    //             lpForUnstake = lpTokenBalance;
    //         }
    //     }
    // }

    /**
     * ActionType: SUPPLY_ASSET_TO_AAVE
     * wbtc -> (supply aave)
     * @param delta - Wbtc in USD e6
     */
    function _supplyWbtcToAave(StrategyWethWbtc self, uint256 delta) public {
        uint256 supplyWbtcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToWbtc(delta) > self.wbtc().balanceOf(address(self)))
                ? self.wbtc().balanceOf(address(self))
                : self.control().usdToWbtc(delta);
        //supplyWbtcAmount = self.control().usdToWbtc(delta);
        // console.log("supplyWbtcAmount", supplyWbtcAmount);
        if (supplyWbtcAmount == 0) {
            return;
        }
        // aave pool may be changed, so we need always approve
        self.wbtc().approve(address(self.control().aavePool()), supplyWbtcAmount);
        // console.log("wbtc address", address(self.wbtc()));
        
        self.control().aavePool().supply(
            address(self.wbtc()),
            supplyWbtcAmount,
            address(self),
            self.REFERRAL_CODE()
        );
        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = self.control().aavePool().getUserAccountData(address(self));
        // console.log("aaveCollateralUsd", aaveCollateralUsd);
        // console.log("aaveBorrowUsd", aaveBorrowUsd);
    }

    /**
     * ActionType: WITHDRAW_ASSET_FROM_AAVE
     * (aave) -> wbtc
     * @param delta - Wbtc in USD e6
     */
    function _withdrawWbtcFromAave(StrategyWethWbtc self, uint256 delta) public {
        uint256 withdrawWbtcAmount = self.control().usdToWbtc(delta);
        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,,,) = self.control().aavePool().getUserAccountData(address(self));
        // console.log("aaveCollateralUsd", aaveCollateralUsd);
        // console.log("aaveBorrowUsd", aaveBorrowUsd);
        self.control().aavePool().withdraw(
            address(self.wbtc()),
            withdrawWbtcAmount,
            address(self)
        );
    }

    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> weth
     * @param delta - Weth in USD e6
     */
    function _borrowWethFromAave(StrategyWethWbtc self, uint256 delta) public {
        uint256 borrowWethAmount = self.control().usdToWeth(delta);
        // console.log("borrowWethAmount", borrowWethAmount);
        
        self.control().aavePool().borrow(
            address(self.weth()),
            borrowWethAmount,
            self.INTEREST_RATE_MODE(),
            self.REFERRAL_CODE(),
            address(self)
        );
        (uint256 aaveCollateralUsd, uint256 aaveBorrowUsd,,uint256 currentLiquidationThreshold,,) = self.control().aavePool().getUserAccountData(address(self));
        // console.log("aaveCollateralUsd", aaveCollateralUsd);
        // console.log("aaveBorrowUsd", aaveBorrowUsd);
        // console.log("currentLiquidationThreshold", currentLiquidationThreshold);
    }

    /**
     * ActionType: REPAY_TOKEN_TO_AAVE
     * weth -> (back to aave)
     * @param delta - Weth in USD e6
     */
    function _repayWethToAave(StrategyWethWbtc self, uint256 delta) public {
        uint256 repayWethAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToWeth(delta) > self.weth().balanceOf(address(self)))
                ? self.weth().balanceOf(address(self))
                : self.control().usdToWeth(delta);

        // console.log("self.weth().balanceOf(address(self))", self.weth().balanceOf(address(self)));
        // console.log("self.control().usdToWeth(delta)", self.control().usdToWeth(delta));
        // console.log("repayWethAmount", repayWethAmount);
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
     * Swap on BeethovenX
     * weth -> wbtc
     * @param delta - Weth in USD e6
     */
    function _swapWethToWbtc(StrategyWethWbtc self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapWethAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToWeth(delta) > self.weth().balanceOf(address(self)))
                ? self.weth().balanceOf(address(self))
                : self.control().usdToWeth(delta);
        if (swapWethAmount == 0) {
            return;
        }
        uint256 amountOutMin = self.control().usdToWbtc(self.control().wethToUsd(swapWethAmount / 10000 * (10000 - slippagePercent)));

        BeethovenExchange.swap(
            self.beethovenxVault(),
            self.poolIdWethWbtc(),
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(self.weth())),
            IAsset(address(self.wbtc())),
            address(this),
            address(this),
            swapWethAmount,
            amountOutMin
        );
    }

    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on BeethovenX
     * wbtc -> weth
     * @param delta - Wbtc in USD e6
     */
    function _swapWbtcToWeth(StrategyWethWbtc self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapWbtcAmount = (delta == self.MAX_UINT_VALUE() || self.control().usdToWbtc(delta) > self.wbtc().balanceOf(address(self)))
                ? self.wbtc().balanceOf(address(self))
                : self.control().usdToWbtc(delta);
        if (swapWbtcAmount <= 100) {
            return;
        }
        uint256 amountOutMin = self.control().usdToWeth(self.control().wbtcToUsd(swapWbtcAmount / 10000 * (10000 - slippagePercent)));
        console.log("swapWbtcAmount", swapWbtcAmount);
        console.log("amountOutMin", amountOutMin);
        BeethovenExchange.swap(
            self.beethovenxVault(),
            self.poolIdWethWbtc(),
            IVault.SwapKind.GIVEN_IN,
            IAsset(address(self.wbtc())),
            IAsset(address(self.weth())),
            address(this),
            address(this),
            swapWbtcAmount,
            amountOutMin
        );
    }

}
