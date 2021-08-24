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

    function setAddr(address _addrAL, address _addrPM) external onlyOwner {
        actList = IActivesList(_addrAL);
        PM = IPortfolioManager(_addrPM);
    }

    function buy(uint256 _amount) public {
        // Amount must be greater than zero
        require(_amount > 0, "amount cannot be 0");
        usdc.transferFrom(msg.sender, address(this), _amount);

        ovn.mint(msg.sender, _amount);


    }

    function balance() public view returns (uint) {
        return ovn.balanceOf(msg.sender);
    }

    function redeem(uint256 _amount) public {
        require(_amount > 0, "You need to redeem at least some tokens");

        uint256 balance = ovn.balanceOf(msg.sender);
        require(balance >= _amount, "You need to redeem at least ovn tokens");

        require(usdc.transfer(msg.sender, _amount), "Transfer failed");

        ovn.burn(msg.sender, _amount);

    }
}
