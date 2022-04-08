/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity >=0.8.0 <0.9.0;

interface IDODOMine {

    // ============ Helper ============

    function getUserLpBalance(address _lpToken, address _user) external view returns (uint256);

    // ============ View Rewards ============

    function getPendingReward(address _lpToken, address _user) external view returns (uint256);

    function getAllPendingReward(address _user) external view returns (uint256);

    function getRealizedReward(address _user) external view returns (uint256);

    function getDlpMiningSpeed(address _lpToken) external view returns (uint256);

    // ============ Deposit & Withdraw & Claim ============
    // Deposit & withdraw will also trigger claim

    function deposit(address _lpToken, uint256 _amount) external;

    function withdraw(address _lpToken, uint256 _amount) external;

    function withdrawAll(address _lpToken) external;

    function claim(address _lpToken) external;

    function claimAll() external;

}
