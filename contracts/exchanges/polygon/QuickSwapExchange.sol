// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../connectors/uniswap/interfaces/IUniswapV2Router02.sol";

abstract contract QuickSwapExchange {

    IUniswapV2Router02 private uniswapRouter;

    function setUniswapRouter(address _uniswapRouter) internal {
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
    }

    function swapTokenToUsdc(
        address swapToken,
        address usdcToken,
        uint256 swapTokenDenominator,
        address sender,
        address recipient,
        uint256 amount
    ) internal returns (uint256) {

        uint256 amountOutMin = 0;
        IERC20(swapToken).approve(address(uniswapRouter), amount);

        address[] memory path = new address[](2);
        path[0] = swapToken;
        path[1] = usdcToken;

        return uniswapRouter.swapExactTokensForTokens(amount, amountOutMin, path, recipient, block.timestamp + 600)[1];
    }

    function getAmountsOut(
        address input,
        address output,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = input;
        path[1] = output;

        uint[] memory amountsOut = uniswapRouter.getAmountsOut(amountInput, path);

        return amountsOut[1];
    }


    uint256[49] private __gap;
}
