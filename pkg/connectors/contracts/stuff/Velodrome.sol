// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface WrappedExternalBribe {

    function notifyRewardAmount(address token, uint256 amount) external;
}

interface VelodromePool {
    function sync() external;
    function skim(address to) external;
}


