// SPDX-License-Identifier: MIT
pragma solidity >=0.5 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC20MintableBurnable.sol";
import "./interfaces/IMark2Market.sol";
import "./OwnableExt.sol";

contract Exchange is OwnableExt {
    IERC20MintableBurnable ovn;
    IERC20 usdc;
    IMark2Market m2m;

    function setTokens(address _ovn, address _usdc) external onlyOwner {
        ovn = IERC20MintableBurnable(_ovn);
        usdc = IERC20(_usdc);
    }

    function setm2m (address _addr ) external onlyOwner {
        m2m = IMark2Market(_addr);
    }

    function buy(address _addrTok, uint256 _amount) public {
        
        IERC20(_addrTok).transferFrom(msg.sender, address(this), _amount);
        ovn.mint(msg.sender, _amount);
        m2m.changeBal(_addrTok, int128(uint128(_amount)));

    }

    function balance() public view returns (uint) {
        return ovn.balanceOf(msg.sender);
    }

    function redeem(address _addrTok, uint256 _amount) public {

        ovn.transferFrom(msg.sender, address(this), _amount);
        ovn.burn(msg.sender, _amount);
        m2m.changeBal(_addrTok, -int128(uint128(_amount)));

        // TODO: correct amount by rates or oracles
        // TODO: check threshhold limits to withdraw deposite
         IERC20(_addrTok).transfer(msg.sender, _amount);
    }
}
