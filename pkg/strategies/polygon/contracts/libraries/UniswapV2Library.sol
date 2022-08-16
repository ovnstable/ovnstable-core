// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/uniswap/v2/interfaces/IUniswapV2Router02.sol";

library UniswapV2Library {

    function swapExactTokensForTokens(
        IUniswapV2Router02 uniswapRouter,
        address inputToken,
        address outputToken,
        uint256 amountInput,
        uint256 amountOutMin,
        address to
    ) public returns (uint256) {

        IERC20(inputToken).approve(address(uniswapRouter), amountInput);

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            amountInput,
            amountOutMin,
            path,
            to,
            block.timestamp
        );

        return amounts[1];
    }

    function getAmountsOut(
        IUniswapV2Router02 uniswapRouter,
        address inputToken,
        address outputToken,
        uint256 amountInput
    ) public view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = uniswapRouter.getAmountsOut(amountInput, path);

        return amounts[1];
    }

}
