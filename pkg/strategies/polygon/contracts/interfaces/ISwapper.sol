// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


interface ISwapper {

    // ---  fields

    // ---  modifiers

    // ---  constructor

    // ---  setters

    // ---  structures

    struct SwapRoute {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOut;
        address swapPlace;
        address pool;
        //        string swapPlaceType;
    }

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        uint256 partsAmount;
    }


    // ---  logic

    function swap(SwapParams calldata params) external returns (uint256);

    function getAmountOut(SwapParams calldata params) external view returns (uint256);

    function swapPath(SwapParams calldata params) external view returns (SwapRoute[] memory);

}
