// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../StrategyBusdWbnb.sol";

import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/AaveBorrowLibrary.sol";
import "@overnight-contracts/connectors/contracts/stuff/Cone.sol";
import "@overnight-contracts/connectors/contracts/stuff/Unknown.sol";
import "@overnight-contracts/connectors/contracts/stuff/Venus.sol";
import "@overnight-contracts/connectors/contracts/stuff/KyberSwap.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";

import "hardhat/console.sol";

library BusdWbnbLibrary {


    /**
     * ActionType: ADD_LIQUIDITY
     * Add liquidity to cone pool:
     * [wbnbn, busd] -> cone lpToken
     * + stake lpToken to Unknown
     */
    function _addLiquidity(StrategyBusdWbnb self, uint256 delta) public {
        if (self.wbnb().balanceOf(address(self)) == 0 || self.usdPlus().balanceOf(address(self)) == 0) {
            return;
        }
        console.log("1");
        uint256 busdBalanceBefore = self.busd().balanceOf(address(self));
        console.log("2");
        self.exchange().redeem(address(self.busd()), self.usdPlus().balanceOf(address(self)) - (delta == self.MAX_UINT_VALUE() ? 0 : delta));
        console.log("3");
        uint256 busdBalanceAfter = self.busd().balanceOf(address(self));

        console.log("self.wbnb().balanceOf(address(self))", self.wbnb().balanceOf(address(self)));
        console.log("busdBalanceAfter - busdBalanceBefore", busdBalanceAfter - busdBalanceBefore);

        self.coneRouter().addLiquidity(
            address(self.wbnb()),
            address(self.busd()),
            false,
            self.wbnb().balanceOf(address(self)),
            busdBalanceAfter - busdBalanceBefore,
            0,
            0,
            address(self),
            block.timestamp
        );

        console.log("lol");

        uint256 lpTokenBalance = self.conePair().balanceOf(address(this));
        self.conePair().approve(address(self.unkwnUserProxy()), lpTokenBalance);
        self.unkwnUserProxy().depositLpAndStake(address(self.conePair()), lpTokenBalance);
    }

    /**
     * ActionType: REMOVE_LIQUIDITY
     * Remove liquidity from cone pool:
     * cone lpToken -> [Wbnb, busd]
     * @param delta - Wbnb amount in USD e6
     */
    function _removeLiquidity(StrategyBusdWbnb self, uint256 delta) public returns (uint256, uint256) {

        uint256 lpForUnstake;
        {
        uint256 poolTokenDelta = self.control().usdToWbnb(delta);
        address userProxyThis = self.unkwnLens().userProxyByAccount(address(this));
        address stakingAddress = self.unkwnLens().stakingRewardsByConePool(address(self.conePair()));
        uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);
        (uint256 poolToken,) = _getLiquidityByLp(self, balanceLp);
        lpForUnstake = poolTokenDelta * balanceLp / poolToken + 1;
        self.unkwnUserProxy().unstakeLpAndWithdraw(address(self.conePair()), lpForUnstake);
        }

        uint256 busdBalanceBefore = self.busd().balanceOf(address(self));

        (uint256 amountWbnb, uint256 amountBusd) = self.coneRouter().removeLiquidity(
            address(self.wbnb()),
            address(self.busd()),
            false,
            lpForUnstake,
            0,
            0,
            address(self),
            block.timestamp
        );

        uint256 busdBalanceAfter = self.busd().balanceOf(address(self));
        uint256 usdpBalanceBefore = self.usdPlus().balanceOf(address(self));
        self.exchange().buy(address(self.busd()), busdBalanceAfter - busdBalanceBefore);
        return (amountWbnb, self.usdPlus().balanceOf(address(self)) - usdpBalanceBefore);
    }


    /**
     * ActionType: SWAP_USDPLUS_TO_ASSET
     * Swap on exchange
     * usdPlus -> busd
     * @param delta - UsdPlus in USD e6
     */
    function _swapUspPlusToBusd(StrategyBusdWbnb self, uint256 delta) public {
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
    function _swapBusdToUsdPlus(StrategyBusdWbnb self, uint256 delta) public {
        uint256 buyBusdAmount = (delta == self.MAX_UINT_VALUE()) ? self.busd().balanceOf(address(self)) : (self.control().usdToBusd(delta));
        if (buyBusdAmount == 0) return;
        self.exchange().buy(address(self.busd()), buyBusdAmount);
    }


    /**
     * ActionType: SUPPLY_ASSET_TO_AAVE
     * busd -> (supply aave)
     * @param delta - Busd in USD e6
     */
    function _supplyBusdToVenus(StrategyBusdWbnb self, uint256 delta) public {
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
    function _withdrawBusdFromVenus(StrategyBusdWbnb self, uint256 delta) public {
        uint256 withdrawBusdAmount = self.control().usdToBusd(delta);
        self.vBusdToken().redeemUnderlying(withdrawBusdAmount);
    }


    /**
     * ActionType: BORROW_TOKEN_FROM_AAVE
     * (borrow from aave) -> wbnb
     * @param delta - Wbnb in USD e6
     */
    function _borrowWbnbFromVenus(StrategyBusdWbnb self, uint256 delta) public {
        uint256 borrowTokenAmount = self.control().usdToWbnb(delta);
        self.vBnbToken().borrow(borrowTokenAmount);
        IWbnb(address(self.wbnb())).deposit{ value: address(this).balance }();
    }


    /**
     * ActionType: REPAY_TOKEN_TO_AAVE
     * wbnb -> (back to aave)
     * @param delta - Wbnb in USD e6
     */
    function _repayWbnbToVenus(StrategyBusdWbnb self, uint256 delta) public {
        uint256 repayWbnbAmount = (delta == self.MAX_UINT_VALUE()) ? self.wbnb().balanceOf(address(self)) : self.control().usdToWbnb(delta);
        if (repayWbnbAmount == 0) return;
        IWbnb(address(self.wbnb())).withdraw(repayWbnbAmount);
        self.maximillion().repayBehalfExplicit{ value: address(this).balance }(address(this), address(self.vBnbToken()));
    }


    /**
     * ActionType: SWAP_TOKEN_TO_ASSET
     * Swap on pancake
     * wbnb -> busd
     * @param delta - Wbnb in USD e6
     */
    function _swapTokenToAsset(StrategyBusdWbnb self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapWbnbAmount = (delta == self.MAX_UINT_VALUE()) ? self.wbnb().balanceOf(address(self)) : self.control().usdToWbnb(delta);
        if (swapWbnbAmount == 0) return;

        uint256 amountOutMin = self.control().usdToBusd(self.control().wbnbToUsd(swapWbnbAmount / 10000 * (10000 - slippagePercent)));

        PancakeSwapLibrary.swapExactTokensForTokens(
                    self.pancakeRouter(),
                    address(self.wbnb()),
                    address(self.busd()),
                    swapWbnbAmount,
                    amountOutMin,
                    address(this)
                );

        self.busd().approve(address(self.coneRouter()), type(uint256).max);
        self.wbnb().approve(address(self.coneRouter()), type(uint256).max);

    }


    /**
     * ActionType: SWAP_ASSET_TO_TOKEN
     * Swap on pancake
     * busd -> wbnb
     * @param delta - BUSD in USD e6
     * example tx: https://bscscan.com/tx/0xd029b94ab61421a1126d29236632c6ce6869d3e753ad857d6b9f55576752ca6a
     */
    function _swapAssetToToken(StrategyBusdWbnb self, uint256 delta, uint256 slippagePercent) public {
        uint256 swapAssetAmount = (delta == self.MAX_UINT_VALUE()) ? self.busd().balanceOf(address(self)) : self.control().usdToBusd(delta);
        if (swapAssetAmount == 0) return;

        uint256 amountOutMin = self.control().usdToWbnb(self.control().busdToUsd(swapAssetAmount / 10000 * (10000 - slippagePercent)));

        PancakeSwapLibrary.swapExactTokensForTokens(
                    self.pancakeRouter(),
                    address(self.busd()),
                    address(self.wbnb()),
                    swapAssetAmount,
                    amountOutMin,
                    address(this)
                );

        self.busd().approve(address(self.coneRouter()), type(uint256).max);
        self.wbnb().approve(address(self.coneRouter()), type(uint256).max);
    }


    /**
     * Own liquidity in pool in their native digits. Used in strategy.
     */
    function _getLiquidity(StrategyBusdWbnb self) public view returns (uint256, uint256) {
        address userProxyThis = self.unkwnLens().userProxyByAccount(address(this));
        address stakingAddress = self.unkwnLens().stakingRewardsByConePool(address(self.conePair()));
        uint256 balanceLp = IERC20(stakingAddress).balanceOf(userProxyThis);
        return _getLiquidityByLp(self, balanceLp);
    }

    function _getLiquidityByLp(StrategyBusdWbnb self, uint256 balanceLp) internal view returns (uint256, uint256) {

         (uint256 reserve0Current, uint256 reserve1Current,) = self.conePair().getReserves();

         uint256 amountLiq0 = reserve0Current * balanceLp / self.conePair().totalSupply();
         uint256 amountLiq1 = reserve1Current * balanceLp / self.conePair().totalSupply();
         return (amountLiq0, amountLiq1);
    }

}
