// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStrategy {

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) external;

    function unstake(
        address _asset,
        uint256 _amount, // minimum expected value for returning
        address _beneficiary
    ) external returns (uint256); // Real unstake value

    function claimRewards(
        address _beneficiary
    ) external returns (uint256); // Return received amount in USDC
}



