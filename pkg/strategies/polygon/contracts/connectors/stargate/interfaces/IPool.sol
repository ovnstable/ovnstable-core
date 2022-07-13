// SPDX-License-Identifier: BUSL-1.1

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPool is IERC20 {

    function poolId() external view returns (uint256);

    function amountLPtoLD(uint256 _amountLP) external view returns (uint256);

}