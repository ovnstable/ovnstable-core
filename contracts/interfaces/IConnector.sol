// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/// @title Common inrterface to DeFi protocol connectors
/// @author @Stanta
/// @notice Every connector have to implement this function
/// @dev Choosing of connector releasing by changing address of connector's contract
interface IConnector {
    
function addLiquidity (uint256 _amount) external;

function removeLiquidity (uint256 _amount) external;

function stake (uint256 _amount) external;

function unstake (uint256 _amount) external;

}