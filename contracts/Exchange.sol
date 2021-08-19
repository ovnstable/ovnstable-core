// SPDX-License-Identifier: MIT
pragma solidity >=0.8 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC20MintableBurnable.sol";
import "./interfaces/IActivesList.sol";
import "./OwnableExt.sol";
import "./interfaces/IPortfolioManager.sol";


contract Exchange is OwnableExt {
    IERC20MintableBurnable ovn;
    IERC20 usdc;
    IActivesList actList;
    IPortfolioManager PM; //portfolio manager contract

    function setTokens(address _ovn, address _usdc) external onlyOwner {
        ovn = IERC20MintableBurnable(_ovn);
        usdc = IERC20(_usdc);
    }

    function setAddr (address _addrAL, address _addrPM  ) external onlyOwner {
        actList = IActivesList(_addrAL);
        PM = IPortfolioManager(_addrPM);
    }

    function buy(address _addrTok, uint256 _amount) public {

        IERC20(_addrTok).transferFrom(msg.sender, address(this), _amount);
        ovn.mint(msg.sender, _amount);
        actList.changeBal(_addrTok, int128(uint128(_amount)));
// call portfolio manager
        IERC20(_addrTok).transfer(address(PM), _amount);
        PM.stake ( _addrTok, _amount);
    }

    function balance() public view returns (uint) {
        return ovn.balanceOf(msg.sender);
    }

    function redeem(address _addrTok, uint256 _amount) public {

        ovn.transferFrom(msg.sender, address(this), _amount);
        ovn.burn(msg.sender, _amount);
        actList.changeBal(_addrTok, -int128(uint128(_amount)));

        // TODO: correct amount by rates or oracles
        // TODO: check threshhold limits to withdraw deposite
         IERC20(_addrTok).transfer(msg.sender, _amount);
    }
}
