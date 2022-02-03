// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/swaps/interfaces/IUniswapV2Router02.sol";

abstract contract QuickswapExchange {

    function swap(
        IUniswapV2Router02 swapRouter,
        address token,
        address usdcToken,
        address sender,
        address recipient,
        uint256 amount
    ) public returns (uint[] memory) {

        uint256 denominator = 10 ** IERC20Metadata(token).decimals();

        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = usdcToken;

        uint[] memory amountsOut = swapRouter.getAmountsOut(amount, path);

        uint256 estimateUsdcOut = denominator * amountsOut[1] / amountsOut[0];

        // skip exchange if estimate USDC less than 3 shares to prevent INSUFFICIENT_OUTPUT_AMOUNT error
        // TODO: may be enough 2 or insert check ratio IN/OUT to make decision
        if (estimateUsdcOut < 3) {
            IERC20(token).transfer(sender, IERC20(token).balanceOf(address(this)));
            return;
        }

        return swapRouter.swapExactTokensForTokens(
            amount,
            0,
            path,
            recipient,
            block.timestamp + 600
        );
    }

    function getUsdcBuyPrice(
        IUniswapV2Router02 swapRouter,
        address usdcToken,
        address token
    ) public view returns (uint256) {
        uint256 denominator = 10 ** IERC20Metadata(token).decimals();

        address[] memory path = new address[](2);
        path[0] = usdcToken;
        path[1] = token;

        uint[] memory amountsOut = swapRouter.getAmountsOut(10 ** 6, path);

        return (10 ** 12) * denominator * amountsOut[0] / amountsOut[1];
    }

    function getUsdcSellPrice(
        IUniswapV2Router02 swapRouter,
        address token,
        address usdcToken
    ) public view returns (uint256) {
        uint256 denominator = 10 ** IERC20Metadata(token).decimals();

        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = usdcToken;

        uint[] memory amountsOut = swapRouter.getAmountsOut(denominator, path);

        return (10 ** 12) * denominator * amountsOut[1] / amountsOut[0];
    }
}
