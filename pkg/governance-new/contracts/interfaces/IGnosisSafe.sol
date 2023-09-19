// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

interface IGnosisSafe {

    function getOwners() external view returns (address[] memory);
}
