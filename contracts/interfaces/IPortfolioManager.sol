// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPortfolioManager {
    function invest(IERC20 _token, uint256 _amount) external;

    function withdraw(IERC20 _token, uint256 _amount) external returns (uint256);

    function balanceOnReward() external;
}
