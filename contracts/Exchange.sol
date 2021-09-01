// SPDX-License-Identifier: MIT
pragma solidity >=0.8 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC20MintableBurnable.sol";
import "./interfaces/IActivesList.sol";
import "./OwnableExt.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IMark2Market.sol";

contract Exchange is OwnableExt {
    IERC20MintableBurnable ovn;
    IERC20 usdc;
    IActivesList actList;
    IPortfolioManager PM; //portfolio manager contract
    IMark2Market m2m;

    event EventExchange(string label, uint256 amount);
    event BusinessEvent(string label, uint256 beforeAmount, uint256 afterAmount);

    function setTokens(address _ovn, address _usdc) external onlyOwner {
        ovn = IERC20MintableBurnable(_ovn);
        usdc = IERC20(_usdc);
    }

    function setAddr(address _addrAL, address _addrPM, address _addrM2M) external onlyOwner {
        actList = IActivesList(_addrAL);
        PM = IPortfolioManager(_addrPM);
        m2m = IMark2Market(_addrM2M);
    }

    function buy(address _addrTok, uint256 _amount) public {
        emit EventExchange("buy", _amount);

        uint256 beforeAmount = ovn.totalSupply();
        IMark2Market.ActivesPrices[] memory beforePrices = m2m.activesPrices();


        uint256 balance = IERC20(_addrTok).balanceOf(msg.sender);
        require(balance >= _amount, "Not enough tokens to buy");

        IERC20(_addrTok).transferFrom(msg.sender, address(this), _amount);
        ovn.mint(msg.sender, _amount);
        actList.changeBal(_addrTok, int128(uint128(_amount)));
        IERC20(_addrTok).transfer(address(PM), _amount);
        PM.stake(_addrTok, _amount);

        uint256 afterAmount = ovn.totalSupply();

        IMark2Market.ActivesPrices[] memory afterPrices = m2m.activesPrices();

        emit BusinessEvent("ovnBalance", beforeAmount, afterAmount);

        for (uint8 a = 0; a < beforePrices.length && a < 100; a++) {

            IMark2Market.ActivesPrices memory beforePrice = beforePrices[a];
            IMark2Market.ActivesPrices memory afterPrice = afterPrices[a];
            emit BusinessEvent(beforePrice.symbol, beforePrice.bookValue, afterPrice.bookValue);
        }

    }

    function balance() public view returns (uint) {
        return ovn.balanceOf(msg.sender);
    }

    function redeem(address _addrTok, uint256 _amount) public {
        emit EventExchange("redeem", _amount);
        uint256 beforeAmount = ovn.totalSupply();

        //TODO: Real unstacke amount may be different to _amount
        uint256 unstakedAmount = PM.unstake(_addrTok, _amount);


        // Or just burn from sender
        ovn.burn(msg.sender, _amount);

        actList.changeBal(_addrTok, - int128(uint128(unstakedAmount)));

        // TODO: correct amount by rates or oracles
        // TODO: check threshhold limits to withdraw deposite
        IERC20(_addrTok).transfer(msg.sender, unstakedAmount);

        uint256 afterAmount = ovn.totalSupply();

        emit BusinessEvent("ovnBalance", beforeAmount, afterAmount);

    }
}
