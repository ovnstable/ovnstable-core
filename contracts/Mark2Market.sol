// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "./interfaces/IActivesList.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IConnector.sol";
import "./OwnableExt.sol";

contract Mark2Market is IMark2Market, OwnableExt {
    IActivesList actListContr;

    uint testprice ;
    function setActList (address _addr) public onlyOwner{
        actListContr = IActivesList(_addr);
    }

    function activesPrices () public view override returns (ActivesPrices[10] memory ap ) {
        IActivesList.Active[] memory actives = actListContr.getAllActives();
        //calculate total activites sum
         //USDC price]
         ap[0] = ActivesPrices( actives[0], 
                    IConnector(actives[0].connector).getPriceOffer(actives[0].actAddress, 
                    actives[0].poolPrice));
        for (uint8 a = 1; a<actives.length && a<100; a++) {
            
            
            if (actives[a].isWork > 0) { 
                 uint price = IConnector(actives[a].connector).getBalance(actives[a].actAddress, 
                    actives[a].poolPrice,
                    actives[a].balance); 
                ap[a] =  ActivesPrices( actives[a], price);
               
            }
            
        }
    }

    function tstPrice (uint256 _tst)  public onlyOwner {
        ActivesPrices[10] memory ap;
        ap = activesPrices ();
        
        testprice = _tst;
    }

    }

    /* // function m2m () {

    // calculate proportions and changes value
        for (uint8 a = 0; a<actives.length; a++) {
                totalSum +=  (uint128 (actives[a].balance)) * priceAct;


        }

    }
 */


