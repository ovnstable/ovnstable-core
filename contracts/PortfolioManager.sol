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

  event ConsoleLog(string str);

  event ConsoleLogNamed(string label, int num);
  event ConsoleLogNamed(string label, uint num);
  event ConsoleLogNamed(string label, string str);
  event ConsoleLogNamed(string label, address addr);

   function setAddr (address _addrAL) external onlyOwner {
        actList = IActivesList(_addrAL);
    }


function stake (address _asset, uint256 _amount) external override {

    // 1. get actives data from active list
    IActivesList.Active memory active = actList.getActive(_asset);
    // 2. sent liquidity to connector
    require(IERC20(_asset).balanceOf(address(this)) >= _amount, "Not enough balance on PM");

    emit ConsoleLogNamed("Before stake USDC ", IERC20(_asset).balanceOf(address(this)));
    emit ConsoleLogNamed("Before stake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));

    IERC20(_asset).transfer(active.connector, _amount);

    emit ConsoleLogNamed("Before stake USDC on Connector", IERC20(_asset).balanceOf(active.connector));
    emit ConsoleLogNamed("Before stake aUSDC on Connector", IERC20(active.aTokenAddress).balanceOf(active.connector));

    // 3. stake
    IConnector(active.connector).stake(_asset, active.poolStake, _amount, address(this));

    emit ConsoleLogNamed("After stake USDC ", IERC20(_asset).balanceOf(address(this)));
    emit ConsoleLogNamed("After stake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));

}

    function unstake(address _asset, uint256 _amount)
        external
        override
        returns (uint256)
    {
        // 1. get actives data from active list
        IActivesList.Active memory active = actList.getActive(_asset);

        // 2. unstake

        emit ConsoleLogNamed("try unstake", _amount);

        emit ConsoleLogNamed("Before unstake USDC ", IERC20(_asset).balanceOf(address(this)));
        emit ConsoleLogNamed("Before unstake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));

        require(IERC20(active.aTokenAddress).balanceOf(address(this)) >= _amount, "Not enough balance aToken on PM");

        IERC20(active.aTokenAddress).transfer(active.connector, _amount);

        emit ConsoleLogNamed("Before unstake USDC on Connector", IERC20(_asset).balanceOf(active.connector));
        emit ConsoleLogNamed("Before unstake aUSDC on Connector", IERC20(active.aTokenAddress).balanceOf(active.connector));

        uint256 unstackedAmount = IConnector(active.connector).unstake(
            _asset,
            active.poolStake,
            _amount,
            address(this)
        );
        emit ConsoleLogNamed("Unstacked", unstackedAmount);
        emit ConsoleLogNamed("After unstake USDC ", IERC20(_asset).balanceOf(address(this)));
        emit ConsoleLogNamed("After unstake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));

        //3. transfer balance to calles
        IERC20(_asset).transfer(msg.sender, unstackedAmount);

        return unstackedAmount;
    }
}
