//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title IProportionFacet Interface
/// @notice Interface for the ProportionFacet which computes token ratios in a liquidity pool
interface IProportionFacet {
    /// @notice Struct representing an input token for a swap
    /// @param tokenAddress The address of the token
    /// @param amount The amount of the token
    /// @param price The price of the token in USD * 10^18
    struct InputSwapToken {
        address tokenAddress;
        uint256 amount;
        uint256 price;
    }

    /// @notice Struct representing the result of a proportion calculation
    /// @param inputTokenAddresses The addresses of tokens for swap
    /// @param inputTokenAmounts The amounts of tokens for swap
    /// @param outputTokenAddresses The addresses of tokens expected to be received after swap
    /// @param outputTokenProportions The proportions in which the output tokens are received
    /// @param outputTokenAmounts The amounts of tokens transfered directly to the pool
    /// @param poolProportionsUsd The expected amounts of tokens received after swap in USD
    struct ResultOfProportion {
        address[] inputTokenAddresses;
        uint256[] inputTokenAmounts;
        address[] outputTokenAddresses;
        uint256[] outputTokenProportions;
        uint256[] outputTokenAmounts;
        uint256[] poolProportionsUsd;
    }

    /// @notice Calculates the proportion for odos and zap
    /// @param pair The address of the token pool
    /// @param tickRange The range of position in ticks
    /// @param inputTokens The input tokens for the zap
    /// @return The result of the proportion calculation
    function getProportionForZap(
        address pair,
        int24[] memory tickRange,
        InputSwapToken[] memory inputTokens
    ) external view returns (ResultOfProportion memory);

    /// @notice Calculates the proportion for a given pool and tick range
    /// @param pair The address of the token pool
    /// @param tickRange The range of position in ticks
    /// @return The proportion of the pool in abstract measurements
    function getProportion(
        address pair,
        int24[] memory tickRange
    ) external view returns (uint256, uint256);
}
