// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "./interfaces/IActivesList.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Mark2Market is Ownable {
    IActivesList actListContr;
    function setActList (address _addr) public onlyOwner{
        actListContr = IActivesList(_addr);
    }
    function m2m () public view returns (int128[] memory actChanges) {
        IActivesList.Active[] memory actives = actListContr.getAllActives();
        //calculate total activites sum
        for (uint8 a = 0; a<actives.length; a++) {


        }
        // calculate proportions and changes value
        for (uint8 a = 0; a<actives.length; a++) {


        }


    }
}
