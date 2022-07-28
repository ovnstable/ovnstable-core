// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/dystopia/interfaces/IDystopiaRouter.sol";
import "../libraries/OvnMath.sol";

library DystopiaLibrary {


    function _swapExactTokensForTokens(
        IDystopiaRouter dystRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        bool isStablePair0,
        bool isStablePair1,
        uint256 amountInput,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(address(dystRouter), amountInput);

        uint256 amountOutMin = _getAmountsOut(dystRouter, address(inputToken), address(middleToken), address(outputToken), isStablePair0, isStablePair1, amountInput);
        if (amountOutMin == 0) {
            return 0;
        }

        IDystopiaRouter.Route[] memory route = new IDystopiaRouter.Route[](2);
        route[0].from = inputToken;
        route[0].to = middleToken;
        route[0].stable = isStablePair0;
        route[1].from = middleToken;
        route[1].to = outputToken;
        route[1].stable = isStablePair1;

        uint[] memory amounts = dystRouter.swapExactTokensForTokens(
            amountInput,
            0,
            route,
            recipient,
            block.timestamp + 600
        );

        return amounts[2];
    }

    function _swap(
        IDystopiaRouter dystRouter,
        address inputToken,
        address outputToken,
        bool isStablePair,
        uint256 amountInput,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(address(dystRouter), type(uint256).max);

        uint256 amountOutMin = _getAmountOut(dystRouter, address(inputToken), address(outputToken), isStablePair,  amountInput);
        if (amountOutMin == 0) {
            return 0;
        }

        IDystopiaRouter.Route[] memory route = new IDystopiaRouter.Route[](1);
        route[0].from = inputToken;
        route[0].to = outputToken;
        route[0].stable = isStablePair;

        uint[] memory amounts = dystRouter.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            route,
            recipient,
            block.timestamp + 600
        );

        return amounts[1];
    }

    function _getAmountOut(
        IDystopiaRouter dystRouter,
        address inputToken,
        address outputToken,
        bool isStablePair,
        uint256 amountInput
    ) internal view returns (uint256) {

        IDystopiaRouter.Route[] memory route = new IDystopiaRouter.Route[](1);
        route[0].from = inputToken;
        route[0].to = outputToken;
        route[0].stable = isStablePair;

        uint[] memory amounts = dystRouter.getAmountsOut(amountInput, route);

        return amounts[1];
    }

    function _getAmountsOut(
        IDystopiaRouter dystRouter,
        address inputToken,
        address middleToken,
        address outputToken,
        bool isStablePair0,
        bool isStablePair1,
        uint256 amountInput
    ) internal view returns (uint256) {

        IDystopiaRouter.Route[] memory route = new IDystopiaRouter.Route[](2);
        route[0].from = inputToken;
        route[0].to = middleToken;
        route[0].stable = isStablePair0;
        route[1].from = middleToken;
        route[1].to = outputToken;
        route[1].stable = isStablePair1;

        uint[] memory amounts = dystRouter.getAmountsOut(amountInput, route);

        return amounts[2];
    }

    function _addLiquidity(
        IDystopiaRouter dystRouter,
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to
    ) internal returns (uint amountA, uint amountB, uint liquidity) {

        IERC20(tokenA).approve(address(dystRouter), amountADesired);
        IERC20(tokenB).approve(address(dystRouter), amountBDesired);

        return dystRouter.addLiquidity(
            tokenA,
            tokenB,
            true,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            to,
            block.timestamp + 600
        );

    }

    function _removeLiquidity(
        IDystopiaRouter dystRouter,
        address tokenA,
        address tokenB,
        address lpToken,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to
    ) internal returns (uint amountA, uint amountB) {

        IERC20(lpToken).approve(address(dystRouter), liquidity);

        return dystRouter.removeLiquidity(
            tokenA,
            tokenB,
            true,
            liquidity,
            amountAMin,
            amountBMin,
            to,
            block.timestamp + 600
        );
    }
}
