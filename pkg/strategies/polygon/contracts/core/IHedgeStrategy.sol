// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IHedgeStrategy {

    event Reward(uint256 amount);

    event Stake(uint256 amount);
    event Unstake(uint256 amount, uint256 amountReceived);

    event Balance(uint256 healthFactor);
    event SetHealthFactor(uint256 healthFactor);

    function stake(
        uint256 _amount // value for staking in asset
    ) external;

    function unstake(
        uint256 _amount, // minimum expected value for unstaking in asset
        address _to      // PortfolioManager
    ) external returns (uint256); // Real unstake value

    function netAssetValue() external view returns (uint256); // Return value in USDC - denominator 6

    function claimRewards(address _to) external returns (uint256); // Return received amount in USDC - denominator 6

    function balance() external ; // Balancing aave health factor

    function setHealthFactor(uint256 healthFactor) external; // Aave healthFactor setter
}
