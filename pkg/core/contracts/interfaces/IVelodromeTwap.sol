// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IVelodromeTwap {

    struct Observation {
        uint256 timestamp;
        uint256 reserve0Cumulative;
        uint256 reserve1Cumulative;
    }

    function observationLength() external view returns (uint256);

    function observations(uint index) external view returns (Observation memory observation);

    function stable() external view returns (bool);

    function token0() external view returns (address);

    function token1() external view returns (address);
}