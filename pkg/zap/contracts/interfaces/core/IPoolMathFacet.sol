//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title IPoolMathFacet
 * @dev Interface for the PoolMathFacet contract, which provides mathematical and utility functions for Uniswap V3 pools.
 */
interface IPoolMathFacet {
    /**
     * @dev Converts a uint256 to a uint160.
     * @param y The uint256 value to convert.
     * @return The converted uint160 value.
     */
    function toUint160(uint256 y) external view returns (uint160);

    /**
     * @dev Performs multiplication and division operations with possible overflow of nominator.
     * @param a The first multiplicand.
     * @param b The second multiplicand.
     * @param denominator The divisor.
     * @return The result of (a * b) / denominator.
     */
    function mulDiv(uint256 a, uint256 b, uint256 denominator) external view returns (uint256);

    /**
     * @dev Calculates the tick index for a given square root price.
     * @param sqrtPriceX96 The square root price in Q64.96 format.
     * @return The corresponding tick index.
     */
    function getTickAtSqrtRatio(uint160 sqrtPriceX96) external view returns (int24);

    /**
     * @dev Calculates the square root price for a given tick index.
     * @param tick The tick index.
     * @return The corresponding square root price in Q64.96 format.
     */
    function getSqrtRatioAtTick(int24 tick) external view returns (uint160);

    /**
     * @dev Retrieves the decimal places for both tokens in a pool.
     * @param pair The address of the pool.
     * @return The decimal places for token0 and token1.
     */
    function getPoolDecimals(address pair) external view returns (uint256, uint256);

    /**
     * @dev Retrieves the current square root price of a pool.
     * @param pair The address of the pool.
     * @return The current square root price in Q64.96 format.
     */
    function getPoolSqrtRatioX96(address pair) external view returns (uint160);

    /**
     * @dev Retrieves the tick spacing of a pool.
     * @param pair The address of the pool.
     * @return The tick spacing.
     */
    function getPoolTickSpacing(address pair) external view returns (int24);

    /**
     * @dev Retrieves the current tick of a pool.
     * @param pair The address of the pool.
     * @return The current tick.
     */
    function getPoolTick(address pair) external view returns (int24);

    /**
     * @dev Retrieves the addresses of both tokens in a pool.
     * @param pair The address of the pool.
     * @return The addresses of token0 and token1.
     */
    function getPoolTokens(address pair) external view returns (address, address);

    /**
     * @dev Checks if the given address corresponds to a valid pool.
     * @param pair The address of the pool.
     * @return A boolean value indicating whether the pool is valid.
     */
    function isValidPool(address pair) external view returns (bool);

    /**
     * @dev Calculates the amount of liquidity for given amounts of token0 and token1.
     * @param sqrtRatioX96 The current square root price of the pool.
     * @param sqrtRatioAX96 The square root price at the lower tick boundary.
     * @param sqrtRatioBX96 The square root price at the upper tick boundary.
     * @param amount0 The amount of token0.
     * @param amount1 The amount of token1.
     * @return The amount of liquidity.
     */
    function getLiquidityForAmounts(
        uint160 sqrtRatioX96,
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 amount0,
        uint256 amount1
    ) external view returns (uint128);

    /**
     * @dev Calculates the amounts of token0 and token1 for a given amount of liquidity.
     * @param sqrtRatioX96 The current square root price of the pool.
     * @param sqrtRatioAX96 The square root price at the lower tick boundary.
     * @param sqrtRatioBX96 The square root price at the upper tick boundary.
     * @param liquidity The amount of liquidity.
     * @return The amounts of token0 and token1.
     */
    function getAmountsForLiquidity(
        uint160 sqrtRatioX96,
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity
    ) external view returns (uint256, uint256);
}
