// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./EtsStructsAndEnums.sol";

import "hardhat/console.sol";

library EtsCalculationLibrary{

    uint256 public constant MAX_UINT_VALUE = type(uint256).max;

    /**
      * d1 = -d2 - Lam - LFu;
      */
    function calcD1(CalcContext memory ctx) internal pure {
        ctx.deltas.d1 = - ctx.deltas.d2 - ctx.amount - ctx.liq.freeUsdPlus;
    }

    /**
      * d2 = d6 * K2;
      */
    function calcD2(CalcContext memory ctx) internal pure {
        ctx.deltas.d2 = ctx.deltas.d6 * ctx.K2 / 1e18;
    }

    /**
      * d3 = -LFw - d5 - d6;
      */
    function calcD3(CalcContext memory ctx) internal pure {
        ctx.deltas.d3 = - ctx.liq.freeWmatic - ctx.deltas.d5 - ctx.deltas.d6;
    }

    /**
      * d4 = K1 * (LBw + d5) - LCu;
      */
    function calcD4(CalcContext memory ctx) internal pure {
        ctx.deltas.d4 = (ctx.liq.borrowWmatic + ctx.deltas.d5) * ctx.K1 / 1e18 - ctx.liq.collateralUsdc;
    }

    /**
      * d5 = LPw - LBw - d6;
      */
    function calcD5(CalcContext memory ctx) internal pure {
        ctx.deltas.d5 = ctx.liq.poolWmatic - ctx.liq.borrowWmatic - ctx.deltas.d6;
    }

    /**
     * d6 = ((K1 - 1) * LPw + LBw - LCu - LFu - LFuc - LFw - Lam) / (K1 + K2);
     */
    function calcD6(CalcContext memory ctx) internal view {

        logSign("K1:", ctx.K1);
        logSign("K2:", ctx.K2);


        int256 a = (ctx.K1 - 1e18) * ctx.liq.poolWmatic / 1e18;
        logSign("a:", a);
        a = a + ctx.liq.borrowWmatic;
        logSign("a:", a);
        a = a - ctx.liq.collateralUsdc;
        logSign("a:", a);
        a = a - ctx.liq.freeUsdPlus;
        logSign("a:", a);
        a = a - ctx.liq.freeUsdc;
        logSign("a:", a);
        a = a - ctx.liq.freeWmatic;
        logSign("a:", a);
        a = a - ctx.amount;
        logSign("a:", a);

        int256 b = ctx.K1 + ctx.K2;
        logSign("b:", b);
        int256 d6 = 1e18 * a / b;

        ctx.deltas.d6 = d6;
    }

    function logSign(string memory msg, int256 value) internal view {
        if (value < 0) {
            console.log(msg, "-", toUint256(- value));
        } else {
            console.log(msg, toUint256(value));
        }
    }

    function abs(int256 value) internal pure returns (uint256){
        if (value < 0) {
            return toUint256(- value);
        } else {
            return toUint256(value);
        }
    }

    function toUint256(int256 value) internal pure returns (uint256) {
        require(value >= 0, "SafeCast: value must be positive");
        return uint256(value);
    }

    function toInt256(uint256 value) internal pure returns (int256) {
        // Note: Unsafe cast below is okay because `type(int256).max` is guaranteed to be positive
        require(value <= uint256(type(int256).max), "SafeCast: value doesn't fit in an int256");
        return int256(value);
    }

    function liquidityToActions(CalcContext2 memory ctx2) public view returns (Action[] memory, uint256) {

        Deltas memory deltas = Deltas(0, 0, 0, 0, 0, 0, 0);
        CalcContext memory ctx = CalcContext(ctx2.K1, ctx2.K2, ctx2.amount, ctx2.liq, ctx2.wmaticUsdcSlippagePersent, deltas);

        //if it is unstake then increase unstake amount to awoid slippages on swap
        if (ctx.amount < 0) {
            //if decrease on wmaticUsdcSlippagePersent then newAmount became oldAmount
            ctx.amount = ctx.amount * 10000 / (10000 - toInt256(ctx.wmaticUsdcSlippagePersent));
        }

        // order specified, don't change
        calcD6(ctx);
        calcD2(ctx);
        calcD1(ctx);
        calcD5(ctx);
        calcD4(ctx);
        calcD3(ctx);
        ctx.deltas.code = (ctx.deltas.d1 >= 0 ? 1 : 0) + 2 * (ctx.deltas.d2 >= 0 ? 1 : 0) + 4 * (ctx.deltas.d3 >= 0 ? 1 : 0) + 8 * (ctx.deltas.d4 >= 0 ? 1 : 0) + 16 * (ctx.deltas.d5 >= 0 ? 1 : 0);


        console.log("-------- Deltas");
        logSign("d1:", ctx.deltas.d1);
        logSign("d2:", ctx.deltas.d2);
        logSign("d3:", ctx.deltas.d3);
        logSign("d4:", ctx.deltas.d4);
        logSign("d5:", ctx.deltas.d5);
        logSign("d6:", ctx.deltas.d6);
        console.log("code:", ctx.deltas.code);
        console.log("--------");


        Action[] memory actions = new Action[](6);
        uint index;

        deltas = ctx.deltas;


        if (deltas.d1 < 0 && deltas.d3 < 0 && deltas.d4 < 0
            || deltas.d1 > 0 && deltas.d3 > 0 && deltas.d4 > 0
        ) {
            revert("D1-D3-D4 have same sign");
        }

        if (deltas.d3 < 0 && deltas.d5 < 0 && deltas.d6 < 0
            || deltas.d3 > 0 && deltas.d5 > 0 && deltas.d6 > 0
        ) {
            revert("D3-D5-D6 have same sign");
        }

        if (deltas.d3 >= 0 && deltas.d4 < 0 && deltas.d5 < 0) {
            // first circle cases (4 cases)
            actions[index++] = Action(ActionType.REMOVE_LIQUIDITY_FROM_DYSTOPIA, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.REPAY_WMATIC_TO_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.WITHDRAW_USDC_FROM_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action((deltas.d1 < 0) ? ActionType.SWAP_USDPLUS_TO_USDC : ActionType.SWAP_USDC_TO_USDPLUS, abs(deltas.d1), 0);
            actions[index++] = Action(ActionType.SWAP_USDC_TO_WMATIC, MAX_UINT_VALUE, ctx.wmaticUsdcSlippagePersent);
            actions[index++] = Action(ActionType.ADD_LIQUIDITY_TO_DYSTOPIA, (ctx2.amount < 0) ? uint(-ctx2.amount) : MAX_UINT_VALUE, 0);
        } else if (deltas.d3 < 0 && deltas.d4 >= 0 && deltas.d5 >= 0) {
            // second circle cases (4 cases)
            actions[index++] = Action(ActionType.REMOVE_LIQUIDITY_FROM_DYSTOPIA, abs(deltas.d3), 0);
            actions[index++] = Action(ActionType.SWAP_WMATIC_TO_USDC, MAX_UINT_VALUE, ctx.wmaticUsdcSlippagePersent);
            actions[index++] = Action((deltas.d1 < 0) ? ActionType.SWAP_USDPLUS_TO_USDC : ActionType.SWAP_USDC_TO_USDPLUS, abs(deltas.d1), 0);
            actions[index++] = Action(ActionType.SUPPLY_USDC_TO_AAVE, MAX_UINT_VALUE, 0);
            actions[index++] = Action(ActionType.BORROW_WMATIC_FROM_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.ADD_LIQUIDITY_TO_DYSTOPIA, (ctx2.amount < 0) ? uint(-ctx2.amount) : MAX_UINT_VALUE, 0);
        } else if (deltas.d1 >= 0 && deltas.d2 >= 0 && deltas.d3 < 0) {
            // unstake without circle (3 cases: 00011,01011,10011)
            actions[index++] = Action(ActionType.REMOVE_LIQUIDITY_FROM_DYSTOPIA, abs(deltas.d6), 0);
            actions[index++] = Action((deltas.d5 < 0) ? ActionType.REPAY_WMATIC_TO_AAVE : ActionType.BORROW_WMATIC_FROM_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.SWAP_WMATIC_TO_USDC, MAX_UINT_VALUE, ctx.wmaticUsdcSlippagePersent);
            actions[index++] = Action((deltas.d4 < 0) ? ActionType.WITHDRAW_USDC_FROM_AAVE : ActionType.SUPPLY_USDC_TO_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action(ActionType.SWAP_USDC_TO_USDPLUS , MAX_UINT_VALUE, 0);
        } else if (deltas.d1 < 0 && deltas.d2 < 0 && deltas.d3 >= 0) {
            // stake without circle (3 cases: 01100,10100,11100)
            actions[index++] = Action(ActionType.SWAP_USDPLUS_TO_USDC, abs(deltas.d1), 0);
            actions[index++] = Action((deltas.d4 < 0) ? ActionType.WITHDRAW_USDC_FROM_AAVE : ActionType.SUPPLY_USDC_TO_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action(ActionType.SWAP_USDC_TO_WMATIC, MAX_UINT_VALUE, ctx.wmaticUsdcSlippagePersent);
            actions[index++] = Action((deltas.d5 < 0) ? ActionType.REPAY_WMATIC_TO_AAVE : ActionType.BORROW_WMATIC_FROM_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action(ActionType.ADD_LIQUIDITY_TO_DYSTOPIA, MAX_UINT_VALUE, 0);
        } else if (deltas.d1 < 0 && deltas.d2 >= 0 && deltas.d4 >= 0 && deltas.d5 < 0) {
            // balance without circle (2 cases: 01010,01110)
            actions[index++] = Action(ActionType.REMOVE_LIQUIDITY_FROM_DYSTOPIA, abs(deltas.d6), 0);
            actions[index++] = Action(ActionType.SWAP_USDPLUS_TO_USDC, abs(deltas.d1), 0);
            actions[index++] = Action((deltas.d3 < 0) ? ActionType.SWAP_WMATIC_TO_USDC : ActionType.SWAP_USDC_TO_WMATIC, abs(deltas.d3), ctx.wmaticUsdcSlippagePersent);
            actions[index++] = Action(ActionType.SUPPLY_USDC_TO_AAVE, MAX_UINT_VALUE, 0);
            actions[index++] = Action(ActionType.REPAY_WMATIC_TO_AAVE, MAX_UINT_VALUE, 0);
        } else if (deltas.d1 >= 0 && deltas.d2 < 0 && deltas.d4 < 0 && deltas.d5 >= 0) {
            // balance without circle (2 cases: 10001,10101)
            actions[index++] = Action(ActionType.WITHDRAW_USDC_FROM_AAVE, abs(deltas.d4), 0);
            actions[index++] = Action(ActionType.BORROW_WMATIC_FROM_AAVE, abs(deltas.d5), 0);
            actions[index++] = Action((deltas.d3 < 0) ? ActionType.SWAP_WMATIC_TO_USDC : ActionType.SWAP_USDC_TO_WMATIC, abs(deltas.d3), ctx.wmaticUsdcSlippagePersent);
            actions[index++] = Action(ActionType.SWAP_USDC_TO_USDPLUS, MAX_UINT_VALUE, 0);
            actions[index++] = Action(ActionType.ADD_LIQUIDITY_TO_DYSTOPIA, (ctx2.amount < 0) ? uint(-ctx2.amount) : MAX_UINT_VALUE, 0);
        } else {
            revert("non-existent case");
        }

        // reassemble array
        Action[] memory tmp = new Action[](index);
        for (uint j; j < index; j++) {
            tmp[j] = actions[j];
        }
        actions = tmp;

        console.log("--------- actions");
        for (uint j; j < actions.length; j++) {
            console.log(j, uint(actions[j].actionType), actions[j].amount);
        }
        console.log("---------");
        return (actions, ctx.deltas.code);
    }

}
