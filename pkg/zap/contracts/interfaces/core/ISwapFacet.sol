//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title ISwapFacet
/// @notice Interface for the SwapFacet contract
/// @dev This interface defines the structure and functions for swapping tokens
interface ISwapFacet {

    /// @notice Error containing information about a swap (for a simulation)
    /// @param balance0 The balance of token0 after the swap
    /// @param balance1 The balance of token1 after the swap
    /// @param ratio0 The ratio of token0 in the pool after the swap
    /// @param ratio1 The ratio of token1 in the pool after the swap
    error SwapError(
        uint256 balance0,
        uint256 balance1,
        uint256 ratio0,
        uint256 ratio1
    );

    /// @notice Executes a swap operation
    /// @param pair The address of the token pool
    /// @param amountIn The amount of tokens to swap
    /// @param sqrtPriceLimitX96 The price limit for the swap
    /// @param zeroForOne True if swapping token0 for token1, false otherwise
    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) external;

    /// @notice Simulates a swap operation without executing it
    /// @param pair The address of the token pool
    /// @param amountIn The amount of tokens to swap
    /// @param sqrtPriceLimitX96 The price limit for the swap
    /// @param zeroForOne True if swapping token0 for token1, false otherwise
    /// @param tickRange An array of ticks to consider in the simulation
    function simulateSwap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        int24[] memory tickRange
    ) external;
}
