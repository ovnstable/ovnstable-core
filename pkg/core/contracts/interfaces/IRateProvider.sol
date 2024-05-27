// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRateProvider {
    function getRate() external view returns (uint256);
}
