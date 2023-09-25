// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IInchSwapper {

    function swap(address recipient, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountMinOut) external;

    function updatePath(address tokenIn, address tokenOut, bytes memory path, uint256 amount, uint256 flags, address srcReceiver) external;

}
