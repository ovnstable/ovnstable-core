// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.0 <0.9.0;

interface ILPStaking {

    function userInfo(uint256 _pid, address _user) external view returns (uint256 amount, uint256 rewardDebt);

    function pendingStargate(uint256 _pid, address _user) external view returns (uint256);

    function deposit(uint256 _pid, uint256 _amount) external;

    function withdraw(uint256 _pid, uint256 _amount) external;

}