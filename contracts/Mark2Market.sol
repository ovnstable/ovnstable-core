// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "./interfaces/IActivesList.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IConnector.sol";
import "./OwnableExt.sol";

contract Mark2Market is IMark2Market, OwnableExt {
    IActivesList actListContr;

    uint testprice ;
    address  addrWault;

    function setAddr (address _addrAL, address _addrWault) public onlyOwner{
        actListContr = IActivesList(_addrAL);
        addrWault = _addrWault;
    }

    function activesPrices () public view override returns (ActivesPrices[] memory ) { 
        IActivesList.Active[] memory actives = actListContr.getAllActives();
        //calculate total activites sum
         //USDC price]
        ActivesPrices[] memory ap = new ActivesPrices[](actives.length);
        for (uint8 a = 0; a<actives.length && a<100; a++) {
            
            
            if (actives[a].isWork > 0) { 
                IERC20Metadata tokAct = IERC20Metadata(actives[a].actAddress);
                uint price = IConnector(actives[a].connector).getPriceOffer(actives[a].actAddress, 
                    actives[a].poolPrice);
                uint bookValue = IConnector(actives[a].connector).getBookValue(actives[a].actAddress, 
                    addrWault, actives[a].poolPrice); 
                uint liqValue = IConnector(actives[a].connector).getLiqValue(actives[a].actAddress, 
                    addrWault, actives[a].poolPrice); 
             
                ap[a] =  ActivesPrices( actives[a].actAddress,
                                        tokAct.name(),
                                        tokAct.symbol(),
                                        tokAct.decimals(),
                                        price, 
                                        bookValue, 
                                        liqValue);
               
            }
            
        }

        return ap;
    }

    function tstPrice (uint256 _tst)  public onlyOwner {
        ActivesPrices[] memory ap = activesPrices ();
        
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


