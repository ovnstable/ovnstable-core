//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IZapFacet {
    struct ZapInParams {
        address pair;
        int24[] tickRange;
        uint256[] amountsOut;
    }

    struct OutputToken {
        address tokenAddress;
        address receiver;
        uint256 amountMin;
    }

    struct InputToken {
        address tokenAddress;
        uint256 amountIn;
    }

    struct SwapData {
        InputToken[] inputs;
        OutputToken[] outputs;
        bytes data;
    }

//    struct ResultOfLiquidity {
//        uint amountAsset0Before;
//        uint amountAsset1Before;
//
//        uint amountAsset0After;
//        uint amountAsset1After;
//
//        uint[] amountsPut;
//        uint[] amountsReturned;
//    }

    function zapIn(SwapData memory swapData, ZapInParams memory paramsData) external;

    function zapOut(uint256 tokenId) external;

    function rebalance(SwapData memory swapData, ZapInParams memory paramsData, uint256 tokenId) external;

    function increase(SwapData memory swapData, ZapInParams memory paramsData, uint256 tokenId) external;

    function merge(uint256 tokenIn, uint256[] memory tokensOut) external;
}
