// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStaker {

    function deposit(address _gauge, uint256 _amount, address _token) external;

    function withdraw(address _gauge, uint256 _amount, address _token) external;

    function harvestRewards(address _gauge, address[] calldata tokens) external;
}
