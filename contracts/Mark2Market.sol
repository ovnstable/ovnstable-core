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

    function prices () public view override returns (uint256[] memory priceAct) {
        IActivesList.Active[] memory actives = actListContr.getAllActives();
        //calculate total activites sum
        for (uint8 a = 0; a<actives.length; a++) {
            {
            
            if (actives[a].isWork > 0) { 
                 priceAct[a] = IConnector(actives[a].poolPrice).getPriceLiq(actives[a].actAddress, 
                                                                            actives[a].poolPrice,
                                                                            actives[a].balance); 
            }
            }
        }


    }

    /* // function m2m () {

    // calculate proportions and changes value
        for (uint8 a = 0; a<actives.length; a++) {
                totalSum +=  (uint128 (actives[a].balance)) * priceAct;


        }

    }
 */

}
