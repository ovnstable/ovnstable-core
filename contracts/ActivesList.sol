// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;
import "./interfaces/IActivesList.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
/// @title ActivesList - mantains list of actives in system
/// @author @stanta
/// @notice CRUU for actives. Unpublishing insrtead of Deleting

contract ActivesList is Ownable, IActivesList {

    mapping (address => uint256) actPos;
    Active[] actList;

    address owner;


    function actAdd (address _addrAct, uint16 _minSh, uint16 _maxSh  ) external override onlyOwner {
        actList.push (Active (_addrAct, _minSh,  _maxSh, 1));
        actPos[_addrAct] = actList.length - 1;
    }

    function editAct (address _addrAct, uint16 _minSh, uint16 _maxSh, uint8 _isW) external override  onlyOwner {
        actList[actPos[_addrAct]] = Active(_addrAct, _minSh, _maxSh, _isW);
    }

    function getAct (address _addrAct) external override view returns (uint16, uint16,  uint8) {
        uint p = actPos[_addrAct];

        return (actList[p].minShare, actList[p].maxShare, actList[p].isWork  );
    }

    function getAllActives () external override view returns (Active[] memory ) {
        return actList;
    }

}
