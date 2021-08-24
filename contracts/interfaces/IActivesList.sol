// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/// @title IActivesList - interface of  ActiveList contract

interface IActivesList  {
    struct Active
    {
        address actAddress; //  active 
        
        address connector;
        address poolPrice; //connector to protocol where we get price for active
        address poolStake; //connector to protocol  where we make staking/unstaking
        uint256 balance;        
        uint16 minShare;
        uint16 maxShare;
        uint8 isWork;
        address[] derivatives; // derivatives in protocols aave active (aUSDC)
    }


    function actAdd (address _addrAct, 
                    address _connector, 
                    address _poolPrice, 
                    address _poolStake,  
                    uint16 _minSh, 
                    uint16 _maxSh, 
                    uint256 _initBal, 
                    address[] memory _derivatives) external;
    function editAct (address _addrAct, address _connector, address _poolPrice, address _poolStake, uint16 _minSh,  uint16 _maxSh, uint8 _isW) external;

    function editActaddDerivate (address _addrAct, address _derivative) external;

    function getActive (address _addrAct) external view returns (Active memory);
    function getAllActives () external view returns (Active[] memory );
    function changeBal (address _active, int128 _balance) external;
        
}
