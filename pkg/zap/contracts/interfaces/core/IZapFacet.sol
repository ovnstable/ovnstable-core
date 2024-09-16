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

        bool needToAdjust;
        bool adjustSwapSide;
        uint256 adjustSwapAmount;
    }

    struct BinSearchParams {
        uint256 left;
        uint256 right;
        uint256 mid;
    }

    function zapIn(SwapData memory swapData, ZapInParams memory paramsData) external;

    function zapOut(uint256 tokenId) external;

    function rebalance(SwapData memory swapData, ZapInParams memory paramsData, uint256 tokenId) external;

    function increase(SwapData memory swapData, ZapInParams memory paramsData, uint256 tokenId) external;

    function merge(
        SwapData memory swapData, 
        ZapInParams memory paramsData, 
        uint256 tokenIn, 
        uint256[] memory tokensOut
    ) external;
}
