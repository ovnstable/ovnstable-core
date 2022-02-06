// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../connectors/swaps/interfaces/IUniswapV2Router02.sol";

contract QuickswapExchange {

    IUniswapV2Router02 public swapRouter;

    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Zero address not allowed");
        swapRouter = IUniswapV2Router02(_swapRouter);
    }

    function swapTokenToUsdc(
        address swapToken,
        address usdcToken,
        uint256 swapTokenDenominator,
        address sender,
        address recipient,
        uint256 amount
    ) public returns (uint256) {

        uint256 estimateUsdcOut = getUsdcSellPrice(swapToken, usdcToken, swapTokenDenominator, amount);

        // skip exchange if estimate USDC less than 3 shares to prevent INSUFFICIENT_OUTPUT_AMOUNT error
        // TODO: may be enough 2 or insert check ratio IN/OUT to make decision
        if (estimateUsdcOut < 3) {
            IERC20(swapToken).transfer(sender, IERC20(swapToken).balanceOf(recipient));
            return new uint[](0);
        }

        uint256 amountOutMin = 0;

        address[] memory path = new address[](2);
        path[0] = swapToken;
        path[1] = usdcToken;

        uint[] memory amounts = swapRouter.swapExactTokensForTokens(amount, amountOutMin, path, recipient, block.timestamp + 600);

        return amounts[1];
    }

    function getUsdcBuyPrice(
        address swapToken,
        address usdcToken,
        uint256 swapTokenDenominator,
        uint256 usdcAmount
    ) public view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = usdcToken;
        path[1] = swapToken;

        uint[] memory amountsOut = swapRouter.getAmountsOut(usdcAmount, path);

        // x + 6 - x = 6
        return swapTokenDenominator * amountsOut[0] / amountsOut[1];
    }

    function getUsdcSellPrice(
        address swapToken,
        address usdcToken,
        uint256 swapTokenDenominator,
        uint256 tokenAmount
    ) public view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = swapToken;
        path[1] = usdcToken;

        uint[] memory amountsOut = swapRouter.getAmountsOut(tokenAmount, path);

        // x + 6 - x = 6
        return swapTokenDenominator * amountsOut[1] / amountsOut[0];
    }
}
