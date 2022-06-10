// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/traderjoe/interfaces/IJoeRouter02.sol";
import "../libraries/OvnMath.sol";

library TraderJoeLibrary {

    function getAmountsOut(
        IJoeRouter02 traderJoeRouter,
        address inputToken,
        address outputToken,
        uint256 amountInput
    ) public view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = traderJoeRouter.getAmountsOut(amountInput, path);

        return amounts[1];
    }

    function getAmountsOut(
        IJoeRouter02 traderJoeRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        uint256 amountInput
    ) public view returns (uint256) {

        address[] memory path = new address[](3);
        path[0] = inputToken;
        path[1] = middleToken;
        path[2] = outputToken;

        uint[] memory amounts = traderJoeRouter.getAmountsOut(amountInput, path);

        return amounts[2];
    }

    function swapExactTokensForTokens(
        IJoeRouter02 traderJoeRouter,
        address inputToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) public returns (uint256) {

        IERC20(inputToken).approve(address(traderJoeRouter), amountInput);

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = traderJoeRouter.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            block.timestamp
        );

        return amounts[1];
    }

    function swapExactTokensForTokens(
        IJoeRouter02 traderJoeRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address recipient
    ) public returns (uint256) {

        IERC20(inputToken).approve(address(traderJoeRouter), amountInput);

        address[] memory path = new address[](3);
        path[0] = inputToken;
        path[1] = middleToken;
        path[2] = outputToken;

        uint[] memory amounts = traderJoeRouter.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            path,
            recipient,
            block.timestamp
        );

        return amounts[2];
    }

    function addLiquidity(
        IJoeRouter02 traderJoeRouter,
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to
    ) public returns (uint amountA, uint amountB, uint liquidity) {

        IERC20(tokenA).approve(address(traderJoeRouter), amountADesired);
        IERC20(tokenB).approve(address(traderJoeRouter), amountBDesired);

        return traderJoeRouter.addLiquidity(
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
        IJoeRouter02 traderJoeRouter,
        address tokenA,
        address tokenB,
        address lpToken,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to
    ) public returns (uint amountA, uint amountB) {

        IERC20(lpToken).approve(address(traderJoeRouter), liquidity);

        return traderJoeRouter.removeLiquidity(
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
