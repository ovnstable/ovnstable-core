// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

library OvnMath {

    function abs(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x > y) ? (x - y) : (y - x);
    }
}
