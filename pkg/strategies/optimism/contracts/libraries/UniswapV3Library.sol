// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/uniswap/v3/interfaces/ISwapRouter02.sol";


library UniswapV3Library {

    function singleSwap(
        address swapRouter,
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient
    ) internal returns (uint256 amountOut) {

        IERC20(tokenIn).approve(swapRouter, amountIn);

        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum,
            sqrtPriceLimitX96: 0
        });

        amountOut = ISwapRouter02(swapRouter).exactInputSingle(params);
    }

    function multiSwap(
        address swapRouter,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee0,
        uint24 fee1,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address recipient
    ) internal returns (uint256 amountOut) {

        IERC20(tokenIn).approve(swapRouter, amountIn);

        IV3SwapRouter.ExactInputParams memory params = IV3SwapRouter.ExactInputParams({
            path: abi.encodePacked(tokenIn, fee0, tokenMid, fee1, tokenOut),
            recipient: recipient,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum
        });

        amountOut = ISwapRouter02(swapRouter).exactInput(params);
    }

}
