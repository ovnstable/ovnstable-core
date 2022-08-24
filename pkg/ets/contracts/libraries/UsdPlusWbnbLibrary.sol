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
    function _removeLiquidity(StrategyUsdPlusWbnb self, uint256 delta) public returns (uint256 amountWmatic, uint256 amountUsdPlus) {

        uint256 poolTokenDelta = self.usdToWbnb(delta);

        uint256 balanceLp = self.coneGauge().balanceOf(address(self));
        (uint256 poolToken,) = _getLiquidityByLp(self, balanceLp);
        uint256 lpForUnstake = poolTokenDelta * balanceLp / poolToken + 1;
        self.coneGauge().withdraw(lpForUnstake);

        (amountWmatic, amountUsdPlus) = self.coneRouter().removeLiquidity(
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
        uint256 redeemUsdPlusAmount = (delta == self.MAX_UINT_VALUE()) ? self.usdPlus().balanceOf(address(self)) : (self.usdToBusd(delta) / 10 ** 12);
        if (redeemUsdPlusAmount == 0) return;
        self.exchange().redeem(address(self.busd()), redeemUsdPlusAmount);
    }


    /**
     * ActionType: SWAP_ASSET_TO_USDPLUS
     * Swap on exchange
     * usdc -> usdPlus
     * @param delta - Usdc in USD e6
     */
    function _swapBusdToUsdPlus(StrategyUsdPlusWbnb self, uint256 delta) public {
         uint256 buyUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.busd().balanceOf(address(self)) : (self.usdToBusd(delta) / 10 ** 12);
         if (buyUsdcAmount == 0) return;
         self.exchange().buy(address(self.busd()), buyUsdcAmount);
    }


    /**
     * ActionType: SUPPLY_ASSET_TO_AAVE
     * usdc -> (supply aave)
     * @param delta - Usdc in USD e6
     */
    function _supplyBusdToVenus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 supplyUsdcAmount = (delta == self.MAX_UINT_VALUE()) ? self.busd().balanceOf(address(self)) : self.usdToBusd(delta);
        if (supplyUsdcAmount == 0) return;
        self.busd().approve(address(self.vBusdToken()), supplyUsdcAmount);
        self.vBusdToken().mint(supplyUsdcAmount);
    }


    /**
     * ActionType: WITHDRAW_ASSET_FROM_AAVE
     * (aave) -> usdc
     * @param delta - Usdc in USD e6
     */
    function _withdrawBusdFromVenus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 withdrawUsdcAmount = self.usdToBusd(delta);
        self.vBusdToken().redeemUnderlying(withdrawUsdcAmount);
    }


    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> wmatic
     * @param delta - Wmatic in USD e6
     */
    function _borrowWbnbFromVenus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 borrowTokenAmount = self.usdToWbnb(delta);
        self.vBnbToken().borrow(borrowTokenAmount);
        IWbnb(address(self.wbnb())).deposit{ value: address(this).balance }();
    }


    /**
     * ActionType: REPAY_TOKEN_TO_AAVE
     * wmatic -> (back to aave)
     * @param delta - Wmatic in USD e6
     */
    function _repayWbnbToVenus(StrategyUsdPlusWbnb self, uint256 delta) public {
        uint256 repayWmaticAmount = (delta == self.MAX_UINT_VALUE()) ? self.wbnb().balanceOf(address(self)) : self.usdToWbnb(delta);
        if (repayWmaticAmount == 0) return;
        IWbnb(address(self.wbnb())).withdraw(repayWmaticAmount);
        self.maximillion().repayBehalfExplicit{ value: address(this).balance }(address(this), address(self.vBnbToken()));
    }


    /**
     * ActionType: SWAP_TOKEN_TO_ASSET
     * Swap on dodo
     * wbnb -> busd
     * @param delta - Wmatic in USD e6
     */
    function _swapTokenToAsset(StrategyUsdPlusWbnb self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapWbnbAmount = (delta == self.MAX_UINT_VALUE()) ? self.wbnb().balanceOf(address(self)) : self.usdToWbnb(delta);
        if (swapWbnbAmount == 0) return;

        (uint256 receiveQuoteAmount,) = IDODOV2(self.dodoBusdWbnb()).querySellBase(address(self), swapWbnbAmount);
        uint256 amountOutMin = receiveQuoteAmount * (10000 - slippagePercent) / 10000;

        address[] memory dodoPairs = new address[](1);
        dodoPairs[0] = self.dodoBusdWbnb();

        self.dodoProxy().dodoSwapV2TokenToToken(
            address(self.wbnb()),
            address(self.busd()),
            swapWbnbAmount,
            amountOutMin,
            dodoPairs,
            0,
            false,
            block.timestamp + 600
        );

    }


    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on dodo
     * busd -> wbnb
     * @param delta - BUSD in USD e6
     * example tx: https://bscscan.com/tx/0xd029b94ab61421a1126d29236632c6ce6869d3e753ad857d6b9f55576752ca6a
     */
    function _swapAssetToToken(StrategyUsdPlusWbnb self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapAssetAmount = (delta == self.MAX_UINT_VALUE()) ? self.busd().balanceOf(address(self)) : self.usdToBusd(delta);
        if (swapAssetAmount == 0) return;

        (uint256 receiveBaseAmount,) = IDODOV2(self.dodoBusdWbnb()).querySellQuote(address(self), swapAssetAmount);
        uint256 amountOutMin = receiveBaseAmount * (10000 - slippagePercent) / 10000;

        address[] memory dodoPairs = new address[](1);
        dodoPairs[0] = self.dodoBusdWbnb();

        self.dodoProxy().dodoSwapV2TokenToToken(
            address(self.busd()),
            address(self.wbnb()),
            swapAssetAmount,
            amountOutMin,
            dodoPairs,
            1, // directions
            false,
            block.timestamp + 600
        );
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
