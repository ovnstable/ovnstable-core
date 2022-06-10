// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IBooster {

    function deposit(
        uint256 _pid,
        uint256 _amount,
        bool depositToPlatypus,
        uint256 deadline
    ) external;

    function multiClaim(
        uint256[] memory _pids,
        address _account
    ) external;

    function withdraw(
        uint256 _pid,
        uint256 _amount,
        bool _claim,
        uint256 minOut
    ) external;

}