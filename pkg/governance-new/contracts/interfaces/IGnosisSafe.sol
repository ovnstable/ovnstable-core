// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IGnosisSafe {

    function getOwners() public view returns (address[] memory);
}
