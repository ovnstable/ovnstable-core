// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockPool {


    IERC20 public token;


    function setToken(address _token) external {
        token = IERC20(_token);
    }


    function skim(address _to) external {
        token.transfer(_to, token.balanceOf(address(this)));
    }

    function sync() external {

    }
}
