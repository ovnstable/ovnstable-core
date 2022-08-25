// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../StrategyUsdPlusWmatic.sol";

import "@overnight-contracts/connectors/contracts/stuff/Dystopia.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";

import "hardhat/console.sol";

library UsdPlusWmaticLibrary {


    /**
     * ActionType: ADD_LIQUIDITY
     * Add liquidity to dyst pool:
     * [wmatic, usdPlus] -> dyst lpToken
     * + stake lpToken to Penrose
     */
    function _addLiquidityToDystopia(StrategyUsdPlusWmatic self, uint256 delta) public {

        self.dystRouter().addLiquidity(
            address(self.wmatic()),
            address(self.usdPlus()),
            false,
            self.wmatic().balanceOf(address(self)),
            self.usdPlus().balanceOf(address(self)) - (delta == self.MAX_UINT_VALUE() ? 0 : delta),
            0,
            0,
            address(self),
            block.timestamp + 600
        );


        uint256 lpTokenBalance = self.dystVault().balanceOf(address(self));
        self.dystVault().approve(address(self.penProxy()), lpTokenBalance);
        self.penProxy().depositLpAndStake(address(self.dystVault()), lpTokenBalance);
    }

    /**
     * ActionType: REMOVE_LIQUIDITY
     * Remove liquidity from dyst pool:
     * dyst lpToken -> [wmatic, usdPlus]
     * @param delta - Wmatic amount in USD e6
     */
    function _removeLiquidityFromDystopia(StrategyUsdPlusWmatic self, uint256 delta) public returns (uint256 amountWmatic, uint256 amountUsdPlus) {

        // calc wmatic tokens amount
        uint256 poolTokenDelta = self.usdToWmatic(delta);

        uint256 lpForUnstake;
        {
            address userProxyThis = self.penLens().userProxyByAccount(address(self));
            address stakingAddress = self.penLens().stakingRewardsByDystPool(address(self.dystVault()));
            uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);
            (uint256 poolToken,) = _getLiquidityByLp(self, balanceLp);
            lpForUnstake = poolTokenDelta * balanceLp / poolToken + 1;
        }

        self.penProxy().unstakeLpAndWithdraw(address(self.dystVault()), lpForUnstake);

        (amountWmatic, amountUsdPlus) = self.dystRouter().removeLiquidity(
            address(self.wmatic()),
            address(self.usdPlus()),
            false,
            lpForUnstake,
            0,
            0,
            address(self),
            block.timestamp + 600
        );

    }


    /**
     * ActionType: SWAP_USDPLUS_TO_ASSET
     * Swap on exchange
     * usdPlus -> usdc
     * @param delta - UsdPlus in USD e6
     */
    function _swapUspPlusToUsdc(StrategyUsdPlusWmatic self, uint256 delta) public {
        uint256 redeemUsdPlusAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdPlus().balanceOf(address(self)) : self.usdToUsdc(delta);
        if (redeemUsdPlusAmount == 0) return;
        self.exchange().redeem(address(self.usdc()), redeemUsdPlusAmount);
    }


    /**
     * ActionType: SWAP_ASSET_TO_USDPLUS
     * Swap on exchange
     * usdc -> usdPlus
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToUsdPlus(StrategyUsdPlusWmatic self, uint256 delta) public {
        uint256 buyUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdc().balanceOf(address(self)) : self.usdToUsdc(delta);
        if (buyUsdcAmount == 0) return;
        self.exchange().buy(address(self.usdc()), buyUsdcAmount);
    }


    /**
     * ActionType: SUPPLY_ASSET_TO_AAVE
     * usdc -> (supply aave)
     * @param delta - Usdc in USD e6
     */
    function _supplyUsdcToAave(StrategyUsdPlusWmatic self, uint256 delta) public {
        uint256 supplyUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdc().balanceOf(address(self)) : self.usdToUsdc(delta);
        if (supplyUsdcAmount == 0) return;
        // aave pool may be changed, so we need always approve
        self.usdc().approve(address(self.aavePool()), supplyUsdcAmount);

        //TODO: check balance ??
        self.aavePool().supply(address(self.usdc()), supplyUsdcAmount, address(this), self.REFERRAL_CODE());
    }


    /**
     * ActionType: WITHDRAW_ASSET_FROM_AAVE
     * (aave) -> usdc
     * @param delta - Usdc in USD e6
     */
    function _withdrawUsdcFromAave(StrategyUsdPlusWmatic self, uint256 delta) public {
        uint256 withdrawUsdcAmount = self.usdToUsdc(delta);
        self.aavePool().withdraw(address(self.usdc()), withdrawUsdcAmount, address(self));
    }


    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> wmatic
     * @param delta - Wmatic in USD e6
     */
    function _borrowTokenFromAave(StrategyUsdPlusWmatic self, uint256 delta) public {
        uint256 borrowTokenAmount = self.usdToWmatic(delta);
        self.aavePool().borrow(
            address(self.wmatic()),
            borrowTokenAmount,
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
    function _repayWmaticToAave(StrategyUsdPlusWmatic self, uint256 delta) public {
        uint256 repayWmaticAmount = (delta == self.MAX_UINT_VALUE()) ? self.wmatic().balanceOf(address(self)) : self.usdToWmatic(delta);
        if (repayWmaticAmount == 0) return;
        // aave pool may be changed, so we need always approve
        self.wmatic().approve(address(self.aavePool()), repayWmaticAmount);

        self.aavePool().repay(
            address(self.wmatic()),
            repayWmaticAmount,
            self.INTEREST_RATE_MODE(),
            address(self)
        );
    }


    /**
     * ActionType: SWAP_TOKEN_TO_ASSET
     * Swap on dystopia
     * usdPlus -> wmatic
     * @param delta - Wmatic in USD e6
     */
    function _swapWmaticToUsdc(StrategyUsdPlusWmatic self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapWmaticAmount = (delta == self.MAX_UINT_VALUE()) ? self.wmatic().balanceOf(address(self)) : self.usdToWmatic(delta);
        if (swapWmaticAmount == 0) return;
        uint256 amountOutMin = self.usdToUsdc(self.wmaticToUsd(swapWmaticAmount / 10000 * (10000 - slippagePercent)));

        uint256 result = UniswapV3Library.singleSwap(
            self.uniswapV3Router(),
            address(self.wmatic()),
            address(self.usdc()),
            self.poolFeeMaticUsdc(),
            address(this),
            swapWmaticAmount,
            amountOutMin
        );
    }


    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on dystopia
     * usdPlus -> wmatic
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToWmatic(StrategyUsdPlusWmatic self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdc().balanceOf(address(self)) : self.usdToUsdc(delta);
        if (swapUsdcAmount == 0) return;
        uint256 amountOutMin = self.usdToWmatic(self.usdcToUsd(swapUsdcAmount / 10000 * (10000 - slippagePercent)));

        uint256 result = UniswapV3Library.singleSwap(
            self.uniswapV3Router(),
            address(self.usdc()),
            address(self.wmatic()),
            self.poolFeeMaticUsdc(),
            address(this),
            swapUsdcAmount,
            amountOutMin
        );
    }


    /**
     * Own liquidity in pool in their native digits. Used in strategy.
     */
    function _getLiquidity(StrategyUsdPlusWmatic self) public view returns (uint256, uint256){

        address userProxyThis = self.penLens().userProxyByAccount(address(self));
        address stakingAddress = self.penLens().stakingRewardsByDystPool(address(self.dystVault()));
        uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);

        return _getLiquidityByLp(self, balanceLp);
    }

    function _getLiquidityByLp(StrategyUsdPlusWmatic self, uint256 balanceLp) internal view returns (uint256, uint256){

        (uint256 reserve0Current, uint256 reserve1Current,) = self.dystVault().getReserves();

        uint256 amountLiq0 = reserve0Current * balanceLp / self.dystVault().totalSupply();
        uint256 amountLiq1 = reserve1Current * balanceLp / self.dystVault().totalSupply();
        return (amountLiq0, amountLiq1);
    }

}
