// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

contract ActivesList {
    struct Active
    {
        address actAdsress;
        uint16 minShare;
        uint16 maxShare;
        uint8 isWork;

    }

    mapping (address => uint256) actPos;
    Active[] actList;

    address owner;

    constructor () {
        owner = msg.sender;
    }

    modifier onlyOwner () {
        require(msg.sender == owner, "only owner can");
        _;
    }

    function setOwner (address _addrOwner) public onlyOwner {
        owner = _addrOwner;
    
    }

    function actAdd (address _addrAct, uint16 _minSh, uint16 _maxSh  ) public onlyOwner {
        actList.push (Active (_addrAct, _minSh,  _maxSh, 1));
        actPos[_addrAct] = actList.length - 1;
    }

    function editAct (address _addrAct, uint16 _minSh, uint16 _maxSh, uint8 _isW) public  onlyOwner {
        actList[actPos[_addrAct]] = Active(_addrAct, _minSh, _maxSh, _isW);
    }

    function getAct (address _addrAct) public view returns (uint16, uint16,  uint8) {
        uint p = actPos[_addrAct];

        return (actList[p].minShare, actList[p].maxShare, actList[p].isWork  );
    }

    function getAllActives () public view returns (Active[] memory ) {
        return actList;
    }

}
