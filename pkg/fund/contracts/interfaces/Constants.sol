// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

bytes32 constant DEFAULT_ADMIN_ROLE = 0x00;
bytes32 constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");
bytes32 constant UNIT_ROLE = keccak256("UNIT_ROLE");
bytes32 constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
uint256 constant MAX_SUPPLY = type(uint256).max;
uint256 constant RESOLUTION_INCREASE = 1e9;