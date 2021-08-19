// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/// @title Common inrterface to DeFi protocol connectors
/// @author @Stanta
/// @notice Every connector have to implement this function
/// @dev Choosing of connector releasing by changing address of connector's contract

import "./interfaces/IPortfolioManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IActivesList.sol";
import "./interfaces/IConnector.sol";

import "./OwnableExt.sol";


contract PortfolioManager is  IPortfolioManager, OwnableExt {
    IActivesList actList;

   function setAddr (address _addrAL) external onlyOwner {
        actList = IActivesList(_addrAL);
    }

    
function stake (address _asset, uint256 _amount) external override {

    // 1. get actives data from active list
    IActivesList.Active memory active = actList.getActive(_asset);
    // 2. sent liquidity to connetor
    IERC20(_asset).transfer(active.connector, _amount);
    // 3. stake
    IConnector(active.connector).stake(_asset, active.poolStake, _amount, address(this));

}

function unstake (address _asset,uint256 _amount ) external override {
return;
}


}