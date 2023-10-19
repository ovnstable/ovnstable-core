// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IInchSwapper {

    struct Route {
        uint256 updateBlock; // last updated block
        uint256 amount; // amount
        uint256 flags; // flags for swap
        address srcReceiver; // receiver
        bytes data; // data for swap
        uint256[] pools; // pools for univ3swap
        bool isUniV3; // delimiter for uni or inch
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
