// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/synapse/interfaces/ISwap.sol";

library SynapseLibrary {

    function calculateSwap(
        ISwap synapseSwap,
        address tokenFrom,
        address tokenTo,
        uint256 dx
    ) internal view returns (uint256) {
        uint8 tokenIndexFrom = synapseSwap.getTokenIndex(tokenFrom);
        uint8 tokenIndexTo = synapseSwap.getTokenIndex(tokenTo);
        return synapseSwap.calculateSwap(tokenIndexFrom, tokenIndexTo, dx);
    }

    function swap(
        ISwap synapseSwap,
        address tokenFrom,
        address tokenTo,
        uint256 dx
    ) internal returns (uint256) {
        uint8 tokenIndexFrom = synapseSwap.getTokenIndex(tokenFrom);
        uint8 tokenIndexTo = synapseSwap.getTokenIndex(tokenTo);
        uint256 minDy = synapseSwap.calculateSwap(tokenIndexFrom, tokenIndexTo, dx);
        if (minDy == 0) {
            return 0;
        }
        IERC20(tokenFrom).approve(address(synapseSwap), dx);
        return synapseSwap.swap(tokenIndexFrom, tokenIndexTo, dx, minDy, block.timestamp);
    }

    /**
     * Get amount of token1 nominated in token0 where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function getAmount0(
        ISwap synapseSwap,
        address token0,
        address token1,
        uint256 amount0Total,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1,
        uint256 precision
    ) internal view returns (uint256 amount0) {
        amount0 = (amount0Total * reserve1) / (reserve0 * denominator1 / denominator0 + reserve1);
        for (uint i = 0; i < precision; i++) {
            uint256 amount1 = calculateSwap(synapseSwap, token0, token1, amount0);
            amount0 = (amount0Total * reserve1) / (reserve0 * amount1 / amount0 + reserve1);
        }
    }

    /**
     * Get amount of lp tokens where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function getAmountLpTokens(
        ISwap synapseSwap,
        address token0,
        address token1,
        uint256 amount0Total,
        uint256 totalAmountLpTokens,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1,
        uint256 precision
    ) internal view returns (uint256 amountLpTokens) {
        amountLpTokens = (totalAmountLpTokens * amount0Total * denominator1) / (reserve0 * denominator1 + reserve1 * denominator0);
        for (uint i = 0; i < precision; i++) {
            uint256 amount1 = reserve1 * amountLpTokens / totalAmountLpTokens;
            uint256 amount0 = calculateSwap(synapseSwap, token1, token0, amount1);
            amountLpTokens = (totalAmountLpTokens * amount0Total * amount1) / (reserve0 * amount1 + reserve1 * amount0);
        }
    }
}