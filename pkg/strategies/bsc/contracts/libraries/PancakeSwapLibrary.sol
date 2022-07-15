// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/pancakeSwap/v2/interfaces/IPancakeRouter02.sol";

library PancakeSwapLibrary {

    function getAmountsOut(
        IPancakeRouter02 pancakeRouter,
        address inputToken,
        address outputToken,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = pancakeRouter.getAmountsOut(amountInput, path);

        return amounts[1];
    }

    function getAmountsOut(
        IPancakeRouter02 pancakeRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](3);
        path[0] = inputToken;
        path[1] = middleToken;
        path[2] = outputToken;

        uint[] memory amounts = pancakeRouter.getAmountsOut(amountInput, path);

        return amounts[2];
    }

    function swapExactTokensForTokens(
        IPancakeRouter02 pancakeRouter,
        address inputToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(address(pancakeRouter), amountInput);

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = pancakeRouter.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            block.timestamp
        );

        return amounts[1];
    }

    function swapExactTokensForTokens(
        IPancakeRouter02 pancakeRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(address(pancakeRouter), amountInput);

        address[] memory path = new address[](3);
        path[0] = inputToken;
        path[1] = middleToken;
        path[2] = outputToken;

        uint[] memory amounts = pancakeRouter.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            block.timestamp
        );

        return amounts[2];
    }

    function addLiquidity(
        IPancakeRouter02 pancakeRouter,
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to
    ) internal returns (uint amountA, uint amountB, uint liquidity) {

        IERC20(tokenA).approve(address(pancakeRouter), amountADesired);
        IERC20(tokenB).approve(address(pancakeRouter), amountBDesired);

        return pancakeRouter.addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            to,
            block.timestamp
        );
    }

    function removeLiquidity(
        IPancakeRouter02 pancakeRouter,
        address tokenA,
        address tokenB,
        address lpToken,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to
    ) internal returns (uint amountA, uint amountB) {

        IERC20(lpToken).approve(address(pancakeRouter), liquidity);

        return pancakeRouter.removeLiquidity(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            to,
            block.timestamp
        );
    }

}
