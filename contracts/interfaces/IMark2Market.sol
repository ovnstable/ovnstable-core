// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "./IActivesList.sol";

interface IMark2Market   {
    struct ActivesPrices {
        IActivesList.Active active;
        uint256 price;

    }

    function activesPrices () external view returns (ActivesPrices[10] memory ) ;


}
