// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.9.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./IERC20MintableBurnable.sol";

contract Exchange {
    IERC20MintableBurnable ovn;
    IERC20 usdc;

    function setTokens(address _ovn, address _usdc) public {
        ovn = IERC20MintableBurnable(_ovn);
        usdc = IERC20(_usdc);
    }

    function buy(uint256 _amount) public {
        usdc.transferFrom(msg.sender, address(this), _amount);
        ovn.mint(_amount);
    }

    function redeem(uint256 _amount) public {
      
        ovn.transferFrom(msg.sender, address(this), _amount);
        ovn.burn(_amount);

        // TODO: correct amount by rates or oracles
        // TODO: check threshhold limits to withdraw deposite
        usdc.transfer(msg.sender, _amount);
    }
}
