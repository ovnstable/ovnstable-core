// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/// @title IActivesList - interface of  ActiveList contract

interface IActivesList  {
    struct Active
    {
        address actAddress;
        address poolPrice; //connector to protocol where we get price for active
        address connectorStake; //connector to protocol  where we make staking/unstaking
        uint256 balance;        
        uint16 minShare;
        uint16 maxShare;
        uint8 isWork;
    
    }


    function actAdd (address _addrAct, address _poolP, address _connector, uint16 _minSh, uint16 _maxSh  ) external;
    function editAct (address _addrAct, address _poolP, address _connector, uint16 _minSh,  uint16 _maxSh, uint8 _isW) external;

    function getActive (address _addrAct) external view returns (Active memory);
    function getAllActives () external view returns (Active[] memory );
    function changeBal (address _active, int128 _balance) external;
        
}
