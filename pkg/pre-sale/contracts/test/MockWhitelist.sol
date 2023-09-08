// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../IWhitelist.sol";

contract MockWhitelist is IWhitelist {

    function isWhitelist(address user) external override view returns (bool){
        return true;
    }

    function verify(address user) external override {

    }
}
