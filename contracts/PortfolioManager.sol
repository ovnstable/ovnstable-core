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

contract PortfolioManager is IPortfolioManager, OwnableExt {
    IActivesList actList;

    event ConsoleLog(string str);

    event ConsoleLogNamed(string label, int256 num);
    event ConsoleLogNamed(string label, uint256 num);
    event ConsoleLogNamed(string label, string str);
    event ConsoleLogNamed(string label, address addr);

    function setAddr(address _addrAL) external onlyOwner {
        actList = IActivesList(_addrAL);
    }

    function stake(address _asset, uint256 _amount) external override {
        // 1. get actives data from active list
        IActivesList.Active memory active = actList.getActive(_asset);
        IActivesList.Active memory active2 = actList.getActive(active.derivatives[0]); //todo choosing active based on strategy
        uint256 bal2 = IERC20(active2.actAddress).balanceOf(address(this));
        // 2. sent liquidity to connector
        // require(IERC20(_asset).balanceOf(address(this)) >= _amount, "Not enough balance on PM");

        // emit ConsoleLogNamed("Before stake USDC ", IERC20(_asset).balanceOf(address(this)));
        // emit ConsoleLogNamed("Before stake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));
        // 3. stake
        // 3.1 act1
        // IERC20(_asset).transfer(active.connector, (_amount * 2) / 3);


        uint toAaveAmount = _amount /2;
        IERC20(_asset).transfer(active.connector, toAaveAmount);

        // emit ConsoleLogNamed("Before stake USDC on Connector", IERC20(_asset).balanceOf(active.connector));
        // emit ConsoleLogNamed("Before stake aUSDC on Connector", IERC20(active.aTokenAddress).balanceOf(active.connector));

        IConnector(active.connector).stake(
            _asset,
            active.poolStake,
            toAaveAmount,
            address(this)
        );
        // 3.2 act2
        // bal2 = IERC20(active2.actAddress).balanceOf(address(this)) - bal2;

        // IERC20(active2.actAddress).transfer(active2.connector, bal2 / 2);

        // IConnector(active2.connector).stake(
        //     active2.actAddress,
        //     active2.poolStake,
        //     bal2 / 2,
        //     address(this)
        // );
    }

    function unstake(address _asset, uint256 _amount) external override returns (uint256) {
        // 1. get actives data from active list
        IActivesList.Active memory active = actList.getActive(_asset);
        // IActivesList.Active memory der1 = actList.getActive(active.derivatives[1]);
        IActivesList.Active memory der0 = actList.getActive(active.derivatives[0]);

        //  calculate needing amount of asset to remove
        //uint balDer0 = IERC20(der0.actAddress).balanceOf(address(this));
//        uint256 withdrAmount = _amount / 2; //* balDer0 / active.balance;


        uint256 withdrawInAUsdc = _amount / 2;

        // unstake derivatives
        // IERC20(der1.actAddress).transfer(
        //     der1.connector,
        //     IERC20(der1.actAddress).balanceOf(address(this))
        // );
        // withdrAmount = IConnector(der1.connector).unstake(
        //     active.derivatives[0], //derivatives[i],
        //     der1.poolStake,
        //     _amount / 3,
        //     address(this)
        // );

        IERC20(der0.actAddress).transfer(
            active.connector,
            withdrawInAUsdc
//            IERC20(der0.actAddress).balanceOf(address(this))
        );
        withdrawInAUsdc = IConnector(active.connector).unstake(
            active.actAddress, //derivatives[i],
            active.poolStake,
            withdrawInAUsdc,
            address(this)
        );
        // 2. unstake

        // emit ConsoleLogNamed("try unstake", _amount);

        // emit ConsoleLogNamed("Before unstake USDC ", IERC20(_asset).balanceOf(address(this)));
        // emit ConsoleLogNamed("Before unstake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));

        // require(IERC20(active.aTokenAddress).balanceOf(address(this)) >= _amount, "Not enough balance aToken on PM");
        // uint256 unstackedAmount;

        /*   for (uint i=active.derivatives.length -1; i>=0 ; i--)
        {       //todo calculate withdrAmount depends on strategy
                // uint balAct1 = IERC20(_asset).balanceOf(address(this)) ;
                // uint balAct2 = IERC20(active.derivatives[i]).balanceOf(address(this));

                // uint withdrAmount = _amount * balAct2 / balAct1;

                IERC20(active.derivatives[i]).transfer(active.connector, withdrAmount);

                // emit ConsoleLogNamed("Before unstake USDC on Connector", IERC20(_asset).balanceOf(active.connector));
                // emit ConsoleLogNamed("Before unstake aUSDC on Connector", IERC20(active.aTokenAddress).balanceOf(active.connector));
                 withdrAmount = IConnector(active.connector).unstake(
                    active.actAddress, //derivatives[i],
                    active.poolStake,
                    withdrAmount,
                    address(this));
                // unstackedAmount =  unstackedAmount + withdrAmount;


                // emit ConsoleLogNamed("Unstacked", unstackedAmount);
                // emit ConsoleLogNamed("After unstake USDC ", IERC20(_asset).balanceOf(address(this)));
                // emit ConsoleLogNamed("After unstake aUSDC ", IERC20(active.aTokenAddress).balanceOf(address(this)));

        } */


        //3. transfer balance to calles
        IERC20(_asset).transfer(msg.sender, _amount);
        return _amount;
    }
}
