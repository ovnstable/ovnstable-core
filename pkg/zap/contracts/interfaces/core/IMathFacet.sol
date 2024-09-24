//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title IMathFacet
/// @notice Interface for mathematical operations related to liquidity pools
/// @dev This interface defines functions for price calculations, tick conversions, and ratio comparisons
interface IMathFacet {

    /// @notice Get the current price of a liquidity pool
    /// @param pair The address of the liquidity pool
    /// @return The current price as a uint256
    function getCurrentPrice(address pair) external view returns (uint256);

    /// @notice Get the tick spacing for a given liquidity pool
    /// @param pair The address of the liquidity pool
    /// @return The tick spacing as an int24
    function getTickSpacing(address pair) external view returns (int24);

    /// @notice Convert a tick to its corresponding price
    /// @param pair The address of the liquidity pool
    /// @param tick The tick to convert
    /// @return The price corresponding to the given tick as a uint256
    function tickToPrice(address pair, int24 tick) external view returns (uint256);

    /// @notice Convert prices to their closest ticks
    /// @param pair The address of the liquidity pool
    /// @param prices An array of prices to convert
    /// @return An array of the closest ticks corresponding to the given prices
    function priceToClosestTick(address pair, uint256[] memory prices) external view returns (int24[] memory);

    /// @notice Get the current tick of a liquidity pool
    /// @param pair The address of the liquidity pool
    /// @return tick The current tick of the pool as an int24
    function getCurrentPoolTick(address pair) external view returns (int24 tick);

    /// @notice Get the closest ticks (such as left <= current tick < right) to the current tick of a liquidity pool
    /// @param pair The address of the liquidity pool
    /// @return left The closest tick to the left of the current tick
    /// @return right The closest tick to the right of the current tick
    function closestTicksForCurrentTick(address pair) external view returns (int24 left, int24 right);

    /// @notice Compare two ratios
    /// @param a Numerator of the first ratio
    /// @param b Denominator of the first ratio
    /// @param c Numerator of the second ratio
    /// @param d Denominator of the second ratio
    /// @return True if a/b > c/d, false otherwise
    function compareRatios(uint256 a, uint256 b, uint256 c, uint256 d) external pure returns (bool);
}
