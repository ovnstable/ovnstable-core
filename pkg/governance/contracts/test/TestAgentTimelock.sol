// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../AgentTimelock.sol";

contract TestAgentTimelock is AgentTimelock{

    uint256 public constant TEST_VALUE = 10;

    constructor() {
        _disableInitializers();
    }
}
