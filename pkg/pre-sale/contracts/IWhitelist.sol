// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IWhitelist {

    function isWhitelist(address user) external view returns (bool);

    function verify(address user) external;
}
