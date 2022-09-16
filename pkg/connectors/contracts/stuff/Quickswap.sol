// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity >=0.8.0 <0.9.0;


interface IStakingDualRewards {
    // Views
    function lastTimeRewardApplicable() external view returns (uint256);

    function rewardPerTokenA() external view returns (uint256);
    function rewardPerTokenB() external view returns (uint256);

    function earnedA(address account) external view returns (uint256);

    function earnedB(address account) external view returns (uint256);

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    // Mutative

    function stake(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function getReward() external;

    function exit() external;
}