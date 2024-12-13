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

    error SlippageError(
        uint160 curSqrtRatio,
        uint160 minSqrtRatio,
        uint160 maxSqrtRatio,
        uint256 check        
    );

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        uint160 minSqrtRatio, 
        uint160 maxSqrtRatio
    ) external;

    function simulateSwap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne,
        int24[] memory tickRange
    ) external;

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata _data
    ) external;

    function withdrawAll(address pair) external;
}