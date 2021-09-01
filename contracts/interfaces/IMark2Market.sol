// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

interface IMark2Market   {
    struct ActivesPrices {
        address addr;
        string name;
        string symbol;
        uint decimals;
        uint256 price;
        uint256 bookValue;
        uint256 liquidationValue;

    }

    function activesPrices () external view returns (ActivesPrices[] memory ) ;

    function activePrices (address _addActive) external view returns (ActivesPrices memory );

}
