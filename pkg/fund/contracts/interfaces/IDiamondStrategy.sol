// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IDiamondStrategy {

    function mint(uint256 amount) external;

    function redeem(uint256 amount) external;

    function totalSupply() external view returns (uint256);

}
