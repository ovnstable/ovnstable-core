// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../StrategyUsdPlusWbnb.sol";

import "@overnight-contracts/connectors/contracts/stuff/Dystopia.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";

import "hardhat/console.sol";

library UsdPlusWbnbLibrary {


    /**
     * ActionType: ADD_LIQUIDITY
     * Add liquidity to dyst pool:
     * [wmatic, usdPlus] -> dyst lpToken
     * + stake lpToken to Penrose
     */
    function _addLiquidity(StrategyUsdPlusWbnb self, uint256 delta) public {

        // self.dystRouter().addLiquidity(
        //     address(self.wmatic()),
        //     address(self.usdPlus()),
        //     false,
        //     self.wmatic().balanceOf(address(self)),
        //     self.usdPlus().balanceOf(address(self)) - (delta == self.MAX_UINT_VALUE() ? 0 : delta),
        //     0,
        //     0,
        //     address(self),
        //     block.timestamp + 600
        // );


        // uint256 lpTokenBalance = self.dystVault().balanceOf(address(self));
        // self.dystVault().approve(address(self.penProxy()), lpTokenBalance);
        // self.penProxy().depositLpAndStake(address(self.dystVault()), lpTokenBalance);
    }

    /**
     * ActionType: REMOVE_LIQUIDITY
     * Remove liquidity from dyst pool:
     * dyst lpToken -> [wmatic, usdPlus]
     * @param delta - Wmatic amount in USD e6
     */
    function _removeLiquidity(StrategyUsdPlusWbnb self, uint256 delta) public returns (uint256 amountWmatic, uint256 amountUsdPlus) {

        // calc wmatic tokens amount
        // uint256 poolTokenDelta = 0;//self.usdToWmatic(delta);

        // uint256 lpForUnstake;
        // {
        //     address userProxyThis = self.penLens().userProxyByAccount(address(self));
        //     address stakingAddress = self.penLens().stakingRewardsByDystPool(address(self.dystVault()));
        //     uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);
        //     (uint256 poolToken,) = _getLiquidityByLp(self, balanceLp);
        //     lpForUnstake = poolTokenDelta * balanceLp / poolToken + 1;
        // }

        // self.penProxy().unstakeLpAndWithdraw(address(self.dystVault()), lpForUnstake);

        // (amountWmatic, amountUsdPlus) = self.dystRouter().removeLiquidity(
        //     address(self.wmatic()),
        //     address(self.usdPlus()),
        //     false,
        //     lpForUnstake,
        //     0,
        //     0,
        //     address(self),
        //     block.timestamp + 600
        // );

    }


    /**
     * ActionType: SWAP_USDPLUS_TO_ASSET
     * Swap on exchange
     * usdPlus -> usdc
     * @param delta - UsdPlus in USD e6
     */
    function _swapUspPlusToUsdc(StrategyUsdPlusWbnb self, uint256 delta) public {
        // uint256 redeemUsdPlusAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdPlus().balanceOf(address(self)) : self.usdToBusd(delta);
        // if (redeemUsdPlusAmount == 0) return;
        // self.exchange().redeem(address(self.usdc()), redeemUsdPlusAmount);
    }


    /**
     * ActionType: SWAP_ASSET_TO_USDPLUS
     * Swap on exchange
     * usdc -> usdPlus
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToUsdPlus(StrategyUsdPlusWbnb self, uint256 delta) public {
        // uint256 buyUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdc().balanceOf(address(self)) : self.usdToBusd(delta);
        // if (buyUsdcAmount == 0) return;
        // self.exchange().buy(address(self.usdc()), buyUsdcAmount);
    }


    /**
     * ActionType: SUPPLY_ASSET_TO_AAVE
     * usdc -> (supply aave)
     * @param delta - Usdc in USD e6
     */
    function _supplyUsdcToAave(StrategyUsdPlusWbnb self, uint256 delta) public {
        // uint256 supplyUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdc().balanceOf(address(self)) : self.usdToBusd(delta);
        // if (supplyUsdcAmount == 0) return;

        // self.busd().approve(address(self.vBusdToken()), supplyUsdcAmount);
        // self.vBusdToken().mint(supplyUsdcAmount);
    }


    /**
     * ActionType: WITHDRAW_ASSET_FROM_AAVE
     * (aave) -> usdc
     * @param delta - Usdc in USD e6
     */
    function _withdrawUsdcFromAave(StrategyUsdPlusWbnb self, uint256 delta) public {
        // uint256 withdrawUsdcAmount = self.usdToBusd(delta);
        // self.vBusdToken().redeemUnderlying(withdrawUsdcAmount);
    }


    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> wmatic
     * @param delta - Wmatic in USD e6
     */
    function _borrowTokenFromAave(StrategyUsdPlusWbnb self, uint256 delta) public {
        // uint256 borrowTokenAmount = self.usdToBnb(delta);

        // self.vBnbToken().borrow(borrowTokenAmount);
    }


    /**
     * ActionType: REPAY_TOKEN_TO_AAVE
     * wmatic -> (back to aave)
     * @param delta - Wmatic in USD e6
     */
    function _repayWmaticToAave(StrategyUsdPlusWbnb self, uint256 delta) public {
        // uint256 repayWmaticAmount = (delta == self.MAX_UINT_VALUE()) ? self.wmatic().balanceOf(address(self)) : self.usdToBnb(delta);
        // if (repayWmaticAmount == 0) return;

        // self.vBnbToken().repayBorrow(repayWmaticAmount);
    }


    /**
     * ActionType: SWAP_TOKEN_TO_ASSET
     * Swap on dystopia
     * usdPlus -> wmatic
     * @param delta - Wmatic in USD e6
     */
    function _swapWmaticToUsdc(StrategyUsdPlusWbnb self, uint256 delta, uint256 slippagePercent) public {
        // uint256 swapWmaticAmount = (delta == self.MAX_UINT_VALUE()) ? self.wmatic().balanceOf(address(self)) : self.usdToBnb(delta);
        // if (swapWmaticAmount == 0) return;
        // uint256 amountOutMin = self.usdToUsdc(self.wmaticToUsd(swapWmaticAmount / 10000 * (10000 - slippagePercent)));

        // uint256 result = UniswapV3Library.singleSwap(
        //     self.uniswapV3Router(),
        //     address(self.wmatic()),
        //     address(self.usdc()),
        //     self.poolFeeMaticUsdc(),
        //     address(this),
        //     swapWmaticAmount,
        //     amountOutMin
        // );
    }


    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on dystopia
     * usdPlus -> wmatic
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToWmatic(StrategyUsdPlusWbnb self, uint256 delta, uint256 slippagePercent) public {
        // uint256 swapUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdc().balanceOf(address(self)) : self.usdToUsdc(delta);
        // if (swapUsdcAmount == 0) return;
        // uint256 amountOutMin = self.usdToWmatic(self.usdcToUsd(swapUsdcAmount / 10000 * (10000 - slippagePercent)));

        // uint256 result = UniswapV3Library.singleSwap(
        //     self.uniswapV3Router(),
        //     address(self.usdc()),
        //     address(self.wmatic()),
        //     self.poolFeeMaticUsdc(),
        //     address(this),
        //     swapUsdcAmount,
        //     amountOutMin
        // );
    }


    /**
     * Own liquidity in pool in their native digits. Used in strategy.
     */
    function _getLiquidity(StrategyUsdPlusWbnb self) public view returns (uint256, uint256){

        // address userProxyThis = self.penLens().userProxyByAccount(address(self));
        // address stakingAddress = self.penLens().stakingRewardsByDystPool(address(self.dystVault()));
        // uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);

        // return _getLiquidityByLp(self, balanceLp);
        return (0, 0);
    }

    function _getLiquidityByLp(StrategyUsdPlusWbnb self, uint256 balanceLp) internal view returns (uint256, uint256){

        // (uint256 reserve0Current, uint256 reserve1Current,) = self.dystVault().getReserves();

        // uint256 amountLiq0 = reserve0Current * balanceLp / self.dystVault().totalSupply();
        // uint256 amountLiq1 = reserve1Current * balanceLp / self.dystVault().totalSupply();
        // return (amountLiq0, amountLiq1);
        return (0, 0);
    }

}
