// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IEnneadFarm {

    function deposit(address pool, uint amount) external;

    function getReward(address[] calldata pool) external;
    
    function withdraw(address pool, uint amount) external;
    
}