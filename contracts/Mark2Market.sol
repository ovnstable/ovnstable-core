// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "./interfaces/IActivesList.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IConnector.sol";
import "./OwnableExt.sol";

contract Mark2Market is IMark2Market, OwnableExt {
    IActivesList actListContr;


    function setActList (address _addr) public onlyOwner{
        actListContr = IActivesList(_addr);
    }

    function m2m () public view override returns (int128[] memory actChanges) {
        IActivesList.Active[] memory actives = actListContr.getAllActives();
        //calculate total activites sum
        uint totalSum; 
        for (uint8 a = 0; a<actives.length; a++) {
            {
            (int128 bal,
             uint16 minShare, 
             uint16 maxShare, 
             uint8 isWork, 
             address connector)= actListContr.getActive(actives[a].actAddress);
            if (isWork > 0) { 
                uint priceAct = IConnector(connector).getPrice(actives[a].actAddress); 
                totalSum +=  (uint128 (bal)) * priceAct;
            }
            }
        }
        // calculate proportions and changes value
        for (uint8 a = 0; a<actives.length; a++) {


        }


    }



}
