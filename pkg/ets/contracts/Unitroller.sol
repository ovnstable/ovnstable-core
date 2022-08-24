// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface Unitroller {
    function enterMarkets(address[] calldata vTokens) external returns (uint[] memory);
}
