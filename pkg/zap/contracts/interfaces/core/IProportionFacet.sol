//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IProportionFacet {
    struct InputSwapToken {
        address tokenAddress;
        uint256 amount;
        uint256 price;
    }

    struct PoolTokenPrices {
        address tokenAddress;
        uint256 price;
    }

    struct ResultOfProportion {
        address[] inputTokenAddresses;
        uint256[] inputTokenAmounts;
        address[] outputTokenAddresses;
        uint256[] outputTokenProportions;
        uint256[] outputTokenAmounts;
        uint256[] poolProportionsUsd;
    }

    struct OutTokenInfo {
        uint256 idx;
        uint256 amount;
        uint256 amountUsd;
        uint256 prop;
        uint256 propAmount;
        uint256 amountToSwap;
        uint256 outAmount;
        address token;
    }

    function getProportionForZap(
        address pair,
        int24[] memory tickRange,
        InputSwapToken[] memory inputTokens
    ) external view returns (ResultOfProportion memory);

    function getProportionForRebalance(
        uint256 tokenId,
        address poolId,
        int24[] memory tickRange,
        PoolTokenPrices[] memory prices
    ) external view returns (ResultOfProportion memory);
}
