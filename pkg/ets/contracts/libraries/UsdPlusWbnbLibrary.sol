// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../StrategyUsdPlusWbnb.sol";

import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";
import "@overnight-contracts/connectors/contracts/stuff/Cone.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/Dodo.sol";

import "hardhat/console.sol";

library UsdPlusWbnbLibrary {


    /**
     * ActionType: ADD_LIQUIDITY
     * Add liquidity to cone pool:
     * [wbnbn, usdPlus] -> cone lpToken
     * + stake lpToken to Unknown
     */
    function _addLiquidity(StrategyUsdPlusWbnb self, uint256 delta) public {
        if (self.wbnb().balanceOf(address(self)) == 0 || self.usdPlus().balanceOf(address(self)) == 0) {
            return;
        }

        self.coneRouter().addLiquidity(
            address(self.wbnb()),
            address(self.usdPlus()),
            false,
            self.wbnb().balanceOf(address(self)),
            self.usdPlus().balanceOf(address(self)) - (delta == self.MAX_UINT_VALUE() ? 0 : delta),
            0,
            0,
            address(self),
            block.timestamp
        );

        self.coneGauge().depositAll(self.veConeId());

    }


    /**
     * ActionType: REMOVE_LIQUIDITY
     * Remove liquidity from cone pool:
     * cone lpToken -> [Wbnb, usdPlus]
     * @param delta - Wbnb amount in USD e6
     */
    function _removeLiquidity(StrategyUsdPlusWbnb self, uint256 delta) public returns (uint256 amountWbnb, uint256 amountUsdPlus) {

        uint256 poolTokenDelta = self.control().usdToWbnb(delta);

        uint256 balanceLp = self.coneGauge().balanceOf(address(self));
        (uint256 poolToken,) = _getLiquidityByLp(self, balanceLp);
        uint256 lpForUnstake = poolTokenDelta * balanceLp / poolToken + 1;
        self.coneGauge().withdraw(lpForUnstake);

        (amountWbnb, amountUsdPlus) = self.coneRouter().removeLiquidity(
            address(self.wbnb()),
            address(self.usdPlus()),
            false,
            lpForUnstake,
            0,
            0,
            address(self),
            block.timestamp
        );

    }


    /**
     * ActionType: SWAP_USDPLUS_TO_ASSET
     * Swap on exchange
     * usdPlus -> busd
     * @param delta - UsdPlus in USD e6
     */
    function _swapUspPlusToBusd(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 redeemUsdPlusAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdPlus().balanceOf(address(self)) : (self.control().usdToBusd(delta) / 10 ** 12);
        if (redeemUsdPlusAmount == 0) return;
        self.exchange().redeem(address(self.busd()), redeemUsdPlusAmount);
    }


    /**
     * ActionType: SWAP_ASSET_TO_USDPLUS
     * Swap on exchange
     * busd -> usdPlus
     * @param delta - Busd in USD e6
     */
    function _swapBusdToUsdPlus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 buyBusdAmount = (delta == self.MAX_UINT_VALUE()) ? self.busd().balanceOf(address(self)) : (self.control().usdToBusd(delta));
        if (buyBusdAmount == 0) return;
        self.exchange().buy(address(self.busd()), buyBusdAmount);
    }


    /**
     * ActionType: SUPPLY_ASSET_TO_AAVE
     * busd -> (supply aave)
     * @param delta - Busd in USD e6
     */
    function _supplyBusdToVenus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 supplyBusdAmount = (delta == self.MAX_UINT_VALUE()) ? self.busd().balanceOf(address(self)) : self.control().usdToBusd(delta);
        if (supplyBusdAmount == 0) return;
        self.busd().approve(address(self.vBusdToken()), supplyBusdAmount);
        self.vBusdToken().mint(supplyBusdAmount);
    }


    /**
     * ActionType: WITHDRAW_ASSET_FROM_AAVE
     * (aave) -> busd
     * @param delta - Busd in USD e6
     */
    function _withdrawBusdFromVenus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 withdrawBusdAmount = self.control().usdToBusd(delta);
        self.vBusdToken().redeemUnderlying(withdrawBusdAmount);
    }


    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> wbnb
     * @param delta - Wbnb in USD e6
     */
    function _borrowWbnbFromVenus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 borrowTokenAmount = self.control().usdToWbnb(delta);
        self.vBnbToken().borrow(borrowTokenAmount);
        IWbnb(address(self.wbnb())).deposit{ value: address(this).balance }();
    }


    /**
     * ActionType: REPAY_TOKEN_TO_AAVE
     * wbnb -> (back to aave)
     * @param delta - Wbnb in USD e6
     */
    function _repayWbnbToVenus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 repayWbnbAmount = (delta == self.MAX_UINT_VALUE()) ? self.wbnb().balanceOf(address(self)) : self.control().usdToWbnb(delta);
        if (repayWbnbAmount == 0) return;
        IWbnb(address(self.wbnb())).withdraw(repayWbnbAmount);
        self.maximillion().repayBehalfExplicit{ value: address(this).balance }(address(this), address(self.vBnbToken()));
    }


    /**
     * ActionType: SWAP_TOKEN_TO_ASSET
     * Swap on dodo
     * wbnb -> busd
     * @param delta - Wbnb in USD e6
     */
    function _swapTokenToAsset(StrategyUsdPlusWbnb self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapWbnbAmount = (delta == self.MAX_UINT_VALUE()) ? self.wbnb().balanceOf(address(self)) : self.control().usdToWbnb(delta);
        if (swapWbnbAmount == 0) return;
    
        uint256 amountOutMin = self.usdToBusd(self.wbnbToUsd(swapWbnbAmount / 10000 * (10000 - slippagePercent)));

        ConeLibrary.swap(
            self.coneRouter(),
            address(self.wbnb()),
            address(self.busd()),
            false,
            swapWbnbAmount,
            amountOutMin,
            address(this)
        );

        self.usdPlus().approve(address(self.coneRouter()), type(uint256).max);
        self.wbnb().approve(address(self.coneRouter()), type(uint256).max);
    }


    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on dodo
     * busd -> wbnb
     * @param delta - BUSD in USD e6
     * example tx: https://bscscan.com/tx/0xd029b94ab61421a1126d29236632c6ce6869d3e753ad857d6b9f55576752ca6a
     */
    function _swapAssetToToken(StrategyUsdPlusWbnb self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapAssetAmount = (delta == self.MAX_UINT_VALUE()) ? self.busd().balanceOf(address(self)) : self.control().usdToBusd(delta);
        if (swapAssetAmount == 0) return;

        uint256 amountOutMin = self.usdToWbnb(self.busdToUsd(swapAssetAmount / 10000 * (10000 - slippagePercent)));

        ConeLibrary.swap(
            self.coneRouter(),
            address(self.busd()),
            address(self.wbnb()),
            false,
            swapAssetAmount,
            amountOutMin,
            address(this)
        );

        self.usdPlus().approve(address(self.coneRouter()), type(uint256).max);
        self.wbnb().approve(address(self.coneRouter()), type(uint256).max);
    }


    /**
     * Own liquidity in pool in their native digits. Used in strategy.
     */
    function _getLiquidity(StrategyUsdPlusWbnb self) public view returns (uint256, uint256) {
        uint256 balanceLp = self.coneGauge().balanceOf(address(self));
        return _getLiquidityByLp(self, balanceLp);
    }

    function _getLiquidityByLp(StrategyUsdPlusWbnb self, uint256 balanceLp) internal view returns (uint256, uint256) {

         (uint256 reserve0Current, uint256 reserve1Current,) = self.conePair().getReserves();

         uint256 amountLiq0 = reserve0Current * balanceLp / self.conePair().totalSupply();
         uint256 amountLiq1 = reserve1Current * balanceLp / self.conePair().totalSupply();
         return (amountLiq0, amountLiq1);
    }

}
