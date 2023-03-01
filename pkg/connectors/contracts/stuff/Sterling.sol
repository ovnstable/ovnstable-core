// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISterlingPair is IERC20 {

    function skim(address to) external;

    function sync() external;

}

interface ISterlingBribe {

    function notifyRewardAmount(address token, uint amount) external;

}
