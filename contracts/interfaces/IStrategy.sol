// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IStrategy {

    function stake(
        address _asset, // USDC
        uint256 _amount, // value for staking in USDC
        address _beneficiary // Vault
    ) external;

    function unstake(
        address _asset, // USDC
        uint256 _amount, // minimum expected value for unstaking in USDC
        address _beneficiary // Vault
    ) external returns (uint256); // Real unstake value

    function netAssetValue(address _holder) external view returns (uint256); // Return value in USDC - denominator 6

    function liquidationValue(address _holder) external view returns (uint256); // Return value in USDC - denominator 6

    function claimRewards(address _beneficiary) external returns (uint256); // Return received amount in USDC - denominator 6

}



