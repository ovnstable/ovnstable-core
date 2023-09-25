// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IInchSwapper {

//     InchSwapper.registerPath(tokenIn, tokenOut);
// InchSwapper.swap(tokenIn, tokenOut, amountIn, amountMinOut);
// InchSwapper.getPath()
// InchSwapper.updatePath(index, path)
    function registerPath(address tokenIn, address tokenOut) external;

    function swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountMinOut) external;

    function getPath(address tokenIn, address tokenOut) external view returns(bytes memory);

    function updatePath(address tokenIn, address tokenOut, bytes calldata path) external;

}
