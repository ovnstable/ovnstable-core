// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/uniswap/v2/interfaces/IUniswapV2Router02.sol";

abstract contract UniswapV2Exchange {

    uint256 constant BASIS_DENOMINATOR = 10 ** 4;
    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4;

    IUniswapV2Router02 private uniswapRouter;

    function _setUniswapRouter(address _uniswapRouter) internal {
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
    }

    function _addBasisPoints(uint256 amount) internal pure returns (uint256) {
        return amount * (BASIS_DENOMINATOR + BASIS_POINTS_FOR_SLIPPAGE) / BASIS_DENOMINATOR;
    }

    function _subBasisPoints(uint256 amount) internal pure returns (uint256) {
        return amount * (BASIS_DENOMINATOR - BASIS_POINTS_FOR_SLIPPAGE) / BASIS_DENOMINATOR;
    }

    function _swapExactTokensForTokens(
        address inputToken,
        address outputToken,
        uint256 amountInput,
        address recipient
    ) internal returns (uint256) {

        IERC20(inputToken).approve(address(uniswapRouter), amountInput);

        uint256 amountOutMin = _getAmountsOut(address(inputToken), address(outputToken), amountInput);
        if (amountOutMin == 0) {
            return 0;
        }

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            amountInput,
            _subBasisPoints(amountOutMin),
            path,
            recipient,
            block.timestamp + 600
        );

        return amounts[1];
    }

    function _getAmountsOut(
        address inputToken,
        address outputToken,
        uint256 amountInput
    ) internal view returns (uint256) {

        address[] memory path = new address[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint[] memory amounts = uniswapRouter.getAmountsOut(amountInput, path);

        return amounts[1];
    }

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to
    ) internal returns (uint amountA, uint amountB, uint liquidity) {

        IERC20(tokenA).approve(address(uniswapRouter), amountADesired);
        IERC20(tokenB).approve(address(uniswapRouter), amountBDesired);

        return uniswapRouter.addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            to,
            block.timestamp + 600
        );
    }

    function _removeLiquidity(
        address tokenA,
        address tokenB,
        address lpToken,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to
    ) internal returns (uint amountA, uint amountB) {

        IERC20(lpToken).approve(address(uniswapRouter), liquidity);

        return uniswapRouter.removeLiquidity(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            to,
            block.timestamp + 600
        );
    }

    uint256[49] private __gap;
}
