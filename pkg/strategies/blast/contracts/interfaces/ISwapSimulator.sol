// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface ISwapSimulator {
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

    error PriceAfterSwapError(
        uint160 sqrtRatioX96
    );

    error SlippageError(
        uint256 amountIn,
        uint160 newSqrtRatioX96,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    );

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) external;

    function simulateSwap(
        address pair,
        uint256 amountIn,
        bool zeroForOne,
        int24 lowerTick,
        int24 upperTick
    ) external;

    function simulatePriceAfterSwap(
        address pair,
        uint256 amountIn,
        bool zeroForOne
    ) external;

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external;

    function withdrawAll(address pair) external;
}