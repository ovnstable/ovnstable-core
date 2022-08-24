// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface Borrow {
        function borrow(uint borrowAmount) external returns (uint);
}
