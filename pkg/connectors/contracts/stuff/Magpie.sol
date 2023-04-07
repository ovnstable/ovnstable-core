// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface MagpiePoolHelper {

    function balance(address _address) external view returns (uint256);

    function deposit(uint256 amount, uint256 minimumAmount) external;

    function withdraw(uint256 amount, uint256 minimumAmount) external;
}

interface MasterMagpie{

    function multiclaimSpec(address[] memory _stakingTokens,address[][] memory _rewardTokens) external;
}
