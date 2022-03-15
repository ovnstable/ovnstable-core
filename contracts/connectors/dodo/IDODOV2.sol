/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity >=0.8.0 <0.9.0;

interface IDODOV2 {
    function querySellBase(
        address trader,
        uint256 payBaseAmount
    ) external view returns (uint256 receiveQuoteAmount,uint256 mtFee);

    function querySellQuote(
        address trader,
        uint256 payQuoteAmount
    ) external view returns (uint256 receiveBaseAmount,uint256 mtFee);
}
