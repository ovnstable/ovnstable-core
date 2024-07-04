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

    struct ResultOfLiquidity {
        uint amountAsset0Before;
        uint amountAsset1Before;

        uint amountAsset0After;
        uint amountAsset1After;

        uint[] amountsPut;
        uint[] amountsReturned;
    }

    function prepareSwap(SwapData memory swapData) external;

    function swap(SwapData memory swapData) external returns (address[] memory, uint256[] memory);

    function zapIn(SwapData memory swapData, ZapInParams memory paramsData) external;

    function addLiquidity(ZapInParams memory paramsData) external;
}
