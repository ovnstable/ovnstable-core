/*

    Copyright 2020 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity >=0.8.0 <0.9.0;

interface IDODOV1Helper {
    function querySellQuoteToken(
        address dodoV1Pool,
        uint256 quoteAmount
    ) external view returns (uint256 receivedBaseAmount);

    function querySellBaseToken(
        address dodoV1Pool,
        uint256 baseAmount
    ) external view returns (uint256 receivedQuoteAmount);
}
