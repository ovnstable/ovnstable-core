// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/// @title Common inrterface to DeFi protocol connectors
/// @author @Stanta
/// @notice Every connector have to implement this function
/// @dev Choosing of connector releasing by changing address of connector's contract
interface IConnector {

    
function stake (address _asset, address _pool,uint256 _amount, address _beneficiar) external;

function unstake (address _asset, address _pool,uint256 _amount, address _to ) external  returns (uint256);

function getPriceOffer (address _asset,  address _pool ) external view  returns (uint256);
function getBalance (address _asset, address _pool) external view  returns (uint256);
function getLiqBalance (address _asset, address _pool ) external view  returns (uint256);

}