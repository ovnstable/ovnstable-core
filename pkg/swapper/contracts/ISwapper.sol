// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./Structures.sol";


interface ISwapper is Structures {

    // --- events

    event SwapPlaceInfoRegistered(
        address indexed token0,
        address indexed token1,
        address pool,
        string swapPlaceType
    );

    event SwapPlaceInfoRemoved(
        address indexed token0,
        address indexed token1,
        address pool
    );

    event SwapPlaceRegistered(
        string swapPlaceType,
        address swapPlace
    );

    event SwapPlaceRemoved(
        string swapPlaceType
    );


    // ---  structures

    struct SwapPlaceInfo {
        address pool;
        string swapPlaceType;
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

    function swapBySwapRoutes(SwapParams calldata params, SwapRoute[] memory swapRoutes) external returns (uint256);

    function getAmountOut(SwapParams calldata params) external view returns (uint256);

    function swapPath(SwapParams calldata params) external view returns (SwapRoute[] memory);

}
