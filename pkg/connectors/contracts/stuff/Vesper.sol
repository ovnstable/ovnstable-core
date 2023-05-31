// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IVesperPool is IERC20Metadata {
    function deposit(uint256 collateralAmount_) external;
    function withdraw(uint256 share_) external;
    function pricePerShare() external view returns (uint256);
}

interface IPoolRewards {
    function claimReward(address) external;
}