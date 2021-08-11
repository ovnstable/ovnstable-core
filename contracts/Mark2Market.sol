// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "./interfaces/IActivesList.sol";
import "./interfaces/IMark2Market.sol";
import "./OwnableExt.sol";

contract Mark2Market is IMark2Market, OwnableExt {
    IActivesList actListContr;

    mapping (address => int128) balances;

    function setActList (address _addr) public onlyOwner{
        actListContr = IActivesList(_addr);
    }

    function m2m () public view override returns (int128[] memory actChanges) {
        IActivesList.Active[] memory actives = actListContr.getAllActives();
        //calculate total activites sum
        uint totalSum; 
        for (uint8 a = 0; a<actives.length; a++) {
            uint priceAct =1;
            totalSum += uint128( balances[actives[a].actAddress]) * priceAct;

        }
        // calculate proportions and changes value
        for (uint8 a = 0; a<actives.length; a++) {


        }


    }

    function changeBal (address _active, int128 _balance) external override  onlyRole ("exchange") {
        
        balances[_active]+=_balance;
    }

}
