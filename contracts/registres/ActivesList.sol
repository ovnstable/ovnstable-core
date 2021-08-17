// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;
import "../interfaces/IActivesList.sol";
import "../OwnableExt.sol";
/// @title ActivesList - mantains list of actives in system
/// @author @stanta
/// @notice CRUU for actives. Unpublishing insrtead of Deleting

contract ActivesList is OwnableExt, IActivesList {

    mapping (address => uint256) actPos;
    Active[] actList;

    function actAdd (address _addrAct, address _poolP, address _connectorS, uint16 _minSh, uint16 _maxSh, uint256 _initBal  ) external override onlyOwner {
        actList.push (Active (_addrAct, _poolP, _connectorS, _initBal,  _minSh,  _maxSh, 1));
        actPos[_addrAct] = actList.length - 1;
    }

    function editAct (address _addrAct, address _poolP, address _connectorS,  uint16 _minSh, uint16 _maxSh, uint8 _isW) external override  onlyOwner {

        actList[actPos[_addrAct]].poolPriceAddr = _poolP;
        actList[actPos[_addrAct]].connectorStakeAddr = _connectorS;
        actList[actPos[_addrAct]].minShare = _minSh;
        actList[actPos[_addrAct]].maxShare = _maxSh;
        actList[actPos[_addrAct]].isWork = _isW;
    }

    function changeBal (address _active, int128 _balance) external override  onlyRole ("exchange") {
        uint p = actPos[_active];

        actList[p].balance = uint128(int128(uint128(actList[p].balance)) + _balance);
    }

    function getActive (address _addrAct) external override view returns (Active memory) {

        return (actList[actPos[_addrAct]] );
    }

    function getAllActives () external override view returns (Active[] memory ) {
        return actList;
    }

}
