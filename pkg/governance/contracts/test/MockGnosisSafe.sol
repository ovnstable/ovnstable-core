// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.8;

import "../interfaces/IGnosisSafe.sol";

contract MockGnosisSafe is IGnosisSafe {


    address[] public owners;

    constructor(address owner) {
        owners.push(owner);
    }

    function addOwner(address owner) public{
        owners.push(owner);
    }

    function getOwners() external view returns (address[] memory){
        return owners;
    }
}
