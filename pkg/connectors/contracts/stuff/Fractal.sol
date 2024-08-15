// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface ISubAccount {
    function activeStrategy() external view returns (address);
    function deposit(IERC20 token, uint256 amount) external;
    function withdraw(IERC20 token, uint256 amount) external;
    function deployToStrategy(IERC20 token, uint256 amount, uint256 minAmount) external;
    function withdrawFromStrategy(IERC20 token, uint256 amount, uint256 minAmount) external;
    function depositToStrategy(IERC20 token, uint256 amount) external;
    function withdrawOnlyFromStrategy(IERC20 token, uint256 amount) external;
}

interface IFractalStrategy is IERC20Metadata {
    function getCurrentGlpPrice() external view returns (uint256);
}