// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/dodo/interfaces/IDODOV1Helper.sol";
import "../connectors/dodo/interfaces/IDODOProxy.sol";
import "../connectors/dodo/interfaces/IDODOV2.sol";



/*
    There are six swap functions in DODOProxy. Which are executed for different sources or versions

    - dodoSwapV1: Used for DODOV1 pools
    - dodoSwapV2ETHToToken: Used for DODOV2 pools and specify ETH as fromToken
    - dodoSwapV2TokenToETH: Used for DODOV2 pools and specify ETH as toToken
    - dodoSwapV2TokenToToken:  Used for DODOV2 pools and both fromToken and toToken are ERC20
    - externalSwap: Used for executing third-party protocols' aggregation algorithm
    - mixSwap: Used for executing DODO’s custom aggregation algorithm

    Note: Best Trading path is calculated by off-chain program. DODOProxy's swap functions is only used for executing.
*/
abstract contract DodoExchange {

    IDODOV1Helper private dodoV1Helper;
    IDODOProxy private dodoProxy;
    address private dodoApprove;

    function setDodoParams(
        address _dodoV1Helper,
        address _dodoProxy,
        address _dodoApprove
    ) internal {
        dodoV1Helper = IDODOV1Helper(_dodoV1Helper);
        dodoProxy = IDODOProxy(_dodoProxy);
        dodoApprove = _dodoApprove;
    }

    /*
        The code example assumes user wanting to use the specify DODOV1 pool for swapping

        Note: Differentiate sellBaseToken or sellQuoteToken. If sellBaseToken represents 0, sellQuoteToken represents 1.
        At the same time, dodoSwapV1 supports multi-hop linear routing, so here we use 0,1
        combination to represent the multi-hop directions to save gas consumption
        For example:
            A - B - C (A - B sellBase and  B - C sellQuote)  Binary: 10, Decimal 2 (directions = 2)
            D - E - F (D - E sellQuote and E - F sellBase) Binary: 01, Decimal 1 (directions = 1)
    */
    function _useDodoSwapV1(
        address dodoV1Pool,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 slippage,
        uint256 directions
    ) internal returns (uint256) {

        uint256 minReturnAmount;
        if (directions == 0) {
            uint256 receivedQuoteAmount = dodoV1Helper.querySellBaseToken(dodoV1Pool, fromTokenAmount);
            minReturnAmount = receivedQuoteAmount * (100 - slippage) / 100;
        } else {
            uint256 receivedBaseAmount = dodoV1Helper.querySellQuoteToken(dodoV1Pool, fromTokenAmount);
            minReturnAmount = receivedBaseAmount * (100 - slippage) / 100;
        }

        address[] memory dodoPairs = new address[](1); //one-hop
        dodoPairs[0] = dodoV1Pool;

        IERC20(fromToken).approve(dodoApprove, fromTokenAmount);

        return dodoProxy.dodoSwapV1(
            fromToken,
            toToken,
            fromTokenAmount,
            minReturnAmount,
            dodoPairs,
            directions,
            false,
            block.timestamp + 600
        );
    }

    /*
        The code example assumes user wanting to use the specify DODOV2 pool for swapping

        Note: Differentiate sellBaseToken or sellQuoteToken. If sellBaseToken represents 0, sellQuoteToken represents 1.
        At the same time, dodoSwapV1 supports multi-hop linear routing, so here we use 0,1
        combination to represent the multi-hop directions to save gas consumption
        For example:
            A - B - C (A - B sellBase and  B - C sellQuote)  Binary: 10, Decimal 2 (directions = 2)
            D - E - F (D - E sellQuote and E - F sellBase) Binary: 01, Decimal 1 (directions = 1)
    */
    function _useDodoSwapV2(
        address dodoV2Pool,
        address fromToken,
        address toToken,
        uint256 fromTokenAmount,
        uint256 slippage,
        uint256 directions
    ) internal returns (uint256) {

        uint256 minReturnAmount;
        if (directions == 0) {
            (uint256 receiveQuoteAmount,) = IDODOV2(dodoV2Pool).querySellBase(address(this), fromTokenAmount);
            minReturnAmount = receiveQuoteAmount * (100 - slippage) / 100;
        } else {
            (uint256 receiveBaseAmount,) = IDODOV2(dodoV2Pool).querySellQuote(address(this), fromTokenAmount);
            minReturnAmount = receiveBaseAmount * (100 - slippage) / 100;
        }

        address[] memory dodoPairs = new address[](1); //one-hop
        dodoPairs[0] = dodoV2Pool;

        IERC20(fromToken).approve(dodoApprove, fromTokenAmount);

        return dodoProxy.dodoSwapV2TokenToToken(
            fromToken,
            toToken,
            fromTokenAmount,
            minReturnAmount,
            dodoPairs,
            directions,
            false,
            block.timestamp + 600
        );
    }

}
