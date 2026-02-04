// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

contract UsdPlusTokenV3 {
    uint256 private storedData;

    function set(uint256 x) public {
        storedData = x;
    }

    function get() public view returns (uint256) {
        return storedData;
    }
}
