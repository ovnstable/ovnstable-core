// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IInchSwapper {

    struct Route {
        uint256 updateBlock;
        uint256 amount;
        uint256 flags;
        address srcReceiver;
        bytes data;
        uint256[] pools;
        bool isUniV3;
        bool isNew;
    }

    struct UpdateParams {
        address tokenIn;
        address tokenOut; 
        uint256 amount; 
        uint256 flags; 
        uint256[] pools;
        address srcReceiver;
        bool isUniV3;
    }

    function swap(address recipient, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountMinOut) external;

    function updatePath(UpdateParams memory params, bytes memory path) external;
    
    function getPath(address tokenIn, address tokenOut) external view returns(Route memory);

}
