// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../StrategyUsdPlusWmatic.sol";

import "@overnight-contracts/connectors/contracts/stuff/Dystopia.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";

import "hardhat/console.sol";

library UsdPlusWmaticLibrary {


    /**
     * ActionType: ADD_LIQUIDITY_TO_DYSTOPIA
     * Add liquidity to dyst pool:
     * [wmatic, usdPlus] -> dyst lpToken
     * + stake lpToken to Penrose
     */
    function _addLiquidityToDystopia(StrategyUsdPlusWmatic self, uint256 delta) public {

        console.log("lol", (delta == self.MAX_UINT_VALUE() ? 0 : delta));
        console.log("kek", self.usdPlus().balanceOf(address(self)));

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
     * ActionType: REMOVE_LIQUIDITY_FROM_DYSTOPIA
     * Remove liquidity from dyst pool:
     * dyst lpToken -> [wmatic, usdPlus]
     * @param delta - Wmatic amount in USD e6
     */
    function _removeLiquidityFromDystopia(StrategyUsdPlusWmatic self, uint256 delta) public returns (uint256 amountWmatic, uint256 amountUsdPlus) {

        // calc wmatic tokens amount
        uint256 poolWmaticDelta = self.usdToWmatic(delta);

        uint256 lpForUnstake;
        {
            address userProxyThis = self.penLens().userProxyByAccount(address(self));
            address stakingAddress = self.penLens().stakingRewardsByDystPool(address(self.dystVault()));
            uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);
            (uint256 poolWmatic,) = _getLiquidityByLp(self, balanceLp);
            lpForUnstake = poolWmaticDelta * balanceLp / poolWmatic + 1;
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
     * ActionType: SWAP_USDPLUS_TO_USDC
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
     * ActionType: SWAP_USDC_TO_USDPLUS
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
     * ActionType: SUPPLY_USDC_TO_AAVE
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
     * ActionType: WITHDRAW_USDC_FROM_AAVE
     * (aave) -> usdc
     * @param delta - Usdc in USD e6
     */
    function _withdrawUsdcFromAave(StrategyUsdPlusWmatic self, uint256 delta) public {
        uint256 withdrawUsdcAmount = self.usdToUsdc(delta);
        self.aavePool().withdraw(address(self.usdc()), withdrawUsdcAmount, address(self));
    }


    /**
     * ActionType: BORROW_WMATIC_FROM_AAVE
     * (borrow from aave) -> wmatic
     * @param delta - Wmatic in USD e6
     */
    function _borrowWmaticFromAave(StrategyUsdPlusWmatic self, uint256 delta) public {
        uint256 borrowWmaticAmount = self.usdToWmatic(delta);
        self.aavePool().borrow(
            address(self.wmatic()),
            borrowWmaticAmount,
            self.INTEREST_RATE_MODE(),
            self.REFERRAL_CODE(),
            address(self)
        );
    }


    /**
     * ActionType: REPAY_WMATIC_TO_AAVE
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
     * ActionType: SWAP_WMATIC_TO_USDC
     * Swap on dystopia
     * usdPlus -> wmatic
     * @param delta - Wmatic in USD e6
     */
    function _swapWmaticToUsdc(StrategyUsdPlusWmatic self, uint256 delta, uint256 slippagePersent) public {
        uint256 swapWmaticAmount = (delta == self.MAX_UINT_VALUE()) ? self.wmatic().balanceOf(address(self)) : self.usdToWmatic(delta);
        if (swapWmaticAmount == 0) return;
        //TODO: replace by UniV3
        uint256 result = DystopiaLibrary._swap(
            self.dystRouter(),
            address(self.wmatic()),
            address(self.usdc()),
            false,
            swapWmaticAmount,
            slippagePersent,
            address(self)
        );
    }


    /**
     * ActionType: SWAP_USDC_TO_WMATIC
     * Swap on dystopia
     * usdPlus -> wmatic
     * @param delta - Usdc in USD e6
     */
    function _swapUsdcToWmatic(StrategyUsdPlusWmatic self, uint256 delta, uint256 slippagePersent) public {
        uint256 swapUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdc().balanceOf(address(self)) : self.usdToUsdc(delta);
        if (swapUsdcAmount == 0) return;
        //TODO: replace by UniV3
        uint256 result = DystopiaLibrary._swap(
            self.dystRouter(),
            address(self.usdc()),
            address(self.wmatic()),
            false,
            swapUsdcAmount,
            slippagePersent,
            address(self)
        );
        console.log("swapUsdcAmount", swapUsdcAmount);
        console.log("result", result);
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
