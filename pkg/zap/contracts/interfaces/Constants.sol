// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

bytes32 constant DEFAULT_ADMIN_ROLE = 0x00;
bytes32 constant UNIT_ROLE = keccak256("UNIT_ROLE");
bytes32 constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");
uint256 constant MAX_UINT_VALUE = type(uint256).max;
uint256 constant BASE_DIV = 1000000;

address constant MASTER_CHEF_V3 = 0x5e09ACf80C0296740eC5d6F643005a4ef8DaA694;
