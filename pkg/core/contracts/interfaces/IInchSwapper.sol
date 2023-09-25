// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IInchSwapper {

    function swap(address recipient, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountMinOut) external;

    function getPath(address tokenIn, address tokenOut) external view returns(bytes memory);

    function updatePath(address tokenIn, address tokenOut, bytes calldata path) external;

}
