// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// Minimal ERC20 interface used by this contract
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

/// Minimal pair interface (UniswapV2 / Solidly-like / DystPair style)
interface IDystPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

contract DystSwap {
    event SwapExecuted(address indexed pair, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, address to);

    /// @notice Calculate output amount using UniswapV2-style formula with 0.3% fee (997/1000)
    /// @dev If the pool uses a different fee, change the constants accordingly.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "DystSwap: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "DystSwap: INSUFFICIENT_LIQUIDITY");

        uint256 amountInWithFee = amountIn * 997; // fee numerator
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee; // fee denominator
        amountOut = numerator / denominator;
    }

    /// @notice Swap on a specific DystPair address
    /// @param pair Address of the pair contract
    /// @param amountIn Amount of tokenIn to provide (caller must approve this contract)
    /// @param tokenIn Address of the input token
    /// @param tokenOut Address of the output token
    /// @param amountOutMin Minimal acceptable output (slippage protection)
    /// @param to Recipient of output tokens (use address(0) to send to msg.sender)
    /// @return amountOut Calculated expected output amount (based on reserves and fee constant)
    function swapOnPair(
        address pair,
        uint256 amountIn,
        address tokenIn,
        address tokenOut,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut) {
        IDystPair p = IDystPair(pair);
        (uint112 reserve0, uint112 reserve1,) = p.getReserves();

        bool zeroForOne = tokenIn == p.token0();
        require(tokenIn == (zeroForOne ? p.token0() : p.token1()), "DystSwap: tokenIn not in pair");
        require(tokenOut == (zeroForOne ? p.token1() : p.token0()), "DystSwap: tokenOut not in pair");

        amountOut = getAmountOut(
            amountIn,
            zeroForOne ? uint256(reserve0) : uint256(reserve1),
            zeroForOne ? uint256(reserve1) : uint256(reserve0)
        );
        require(amountOut >= amountOutMin, "DystSwap: INSUFFICIENT_OUTPUT_AMOUNT");

        require(IERC20(tokenIn).transferFrom(msg.sender, pair, amountIn), "DystSwap: transferIn failed");

        p.swap(
            zeroForOne ? 0 : amountOut,
            zeroForOne ? amountOut : 0,
            to == address(0) ? msg.sender : to,
            ""
        );

        emit SwapExecuted(pair, tokenIn, tokenOut, amountIn, amountOut, to == address(0) ? msg.sender : to);
    }

    // --- Optional helpers ---

    /// @notice Convenience: compute expected output without performing swap
    function quoteAmountOut(address pair, uint256 amountIn, address tokenIn) external view returns (uint256) {
        IDystPair p = IDystPair(pair);
        address token0 = p.token0();
        address token1 = p.token1();
        (uint112 reserve0, uint112 reserve1,) = p.getReserves();

        if (tokenIn == token0) {
            return getAmountOut(amountIn, reserve0, reserve1);
        } else if (tokenIn == token1) {
            return getAmountOut(amountIn, reserve1, reserve0);
        } else {
            revert("DystSwap: tokenIn not in pair");
        }
    }
}
