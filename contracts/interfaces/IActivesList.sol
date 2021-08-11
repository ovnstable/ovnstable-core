// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/// @title IActivesList - interface of  ActiveList contract

interface IActivesList  {
    struct Active
    {
        address actAdsress;
        uint16 minShare;
        uint16 maxShare;
        uint8 isWork;

    }


    function actAdd (address _addrAct, uint16 _minSh, uint16 _maxSh  ) external;
    function editAct (address _addrAct, uint16 _minSh, uint16 _maxSh, uint8 _isW) external;

    function getAct (address _addrAct) external view returns (uint16, uint16,  uint8);
    function getAllActives () external view returns (Active[] memory );

}
