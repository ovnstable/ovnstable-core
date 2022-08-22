// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

    enum ActionType {
        ADD_LIQUIDITY_TO_DYSTOPIA, // D2, D6 < 0
        REMOVE_LIQUIDITY_FROM_DYSTOPIA, // D2, D6 > 0

        SWAP_USDPLUS_TO_USDC, // D1 < 0
        SWAP_USDC_TO_USDPLUS, // D1 > 0

        SUPPLY_USDC_TO_AAVE, // D4 > 0
        WITHDRAW_USDC_FROM_AAVE, // D4 < 0

        BORROW_WMATIC_FROM_AAVE, // D5 > 0
        REPAY_WMATIC_TO_AAVE, // D5 < 0

        SWAP_WMATIC_TO_USDC, // D3 < 0
        SWAP_USDC_TO_WMATIC     // D3 > 0
    }

    struct SetupParams {
        // tokens
        address usdc;
        address aUsdc;
        address wmatic;
        address usdPlus;
        address penToken;
        address dyst;
        // common
        address exchanger;
        address dystRewards;
        address dystVault;
        address dystRouter;
        address penProxy;
        address penLens;
        uint256 wmaticUsdcSlippagePersent;
        // aave
        address aavePoolAddressesProvider;
        uint256 liquidationThreshold;
        uint256 healthFactor;
        uint256 balancingDelta;
    }


// method 0--nothing, 1--stake, 2--unstake
    struct BalanceContext {
        uint256 caseNumber;
        uint256 aaveCollateralUsdDelta;
        uint256 aaveBorrowUsdDelta;
        uint256 poolUsdpUsdDelta;
        Method method;
        uint256 amount;
    }

    enum Method {
        NOTHING,
        STAKE,
        UNSTAKE
    }

// liquidity in USD e6, all positive
    struct Liquidity {
        int256 collateralUsdc;
        int256 borrowWmatic;
        int256 poolWmatic;
        int256 poolUsdPlus;
        int256 freeUsdPlus;
        int256 freeUsdc;
        int256 freeWmatic;
    }

// liquidity deltas in USD e6, may contain zeroes and below zero
    struct Deltas {
        int256 d1;
        int256 d2;
        int256 d3;
        int256 d4;
        int256 d5;
        int256 d6;
        uint256 code;
    }

    struct Action {
        ActionType actionType;
        uint256 amount;
        uint256 slippagePersent;
    }

    struct Action2 {
        uint256 actionType;
        uint256 amount;
        uint256 slippagePersent;
    }

    struct CalcContext {
        int256 K1; // in e18
        int256 K2; // in e18
        int256 amount; // amount in USD, below zero if UNSTAKE
        Liquidity liq; // in USD e6
        uint256 wmaticUsdcSlippagePersent;
        Deltas deltas; // in USD e6
    }

    struct CalcContext2 {
        int256 K1; // in e18
        int256 K2; // in e18
        int256 amount; // amount in USD, below zero if UNSTAKE
        Liquidity liq; // in USD e6
        uint256 wmaticUsdcSlippagePersent;
    }
