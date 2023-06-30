// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library AuraRewardUsdcUsdtDaiLibrary {

    function transferAuraToTreasure() public {

        IERC20 aura = IERC20(0x1509706a6c66CA549ff0cB464de88231DDBe213B);

        uint256 balance = aura.balanceOf(address(this));
        if (balance > 0) {
            aura.transfer(0x784Cf4b62655486B405Eb76731885CC9ed56f42f, balance);
        }
    }

    function swapBalToUsdc() public returns (uint256){

        IERC20 bal = IERC20(0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8);
        IERC20 weth = IERC20(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
        IERC20 usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);

        bytes32 balWethPoolId = 0xcc65a812ce382ab909a11e434dbf75b34f1cc59d000200000000000000000001;

        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);
        IVault vault = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);

        uint256 balBalance = bal.balanceOf(address(this));
        if (balBalance > 0) {
            BalancerLibrary.swap(
                vault,
                IVault.SwapKind.GIVEN_IN,
                address(bal),
                address(weth),
                balWethPoolId,
                balBalance,
                0,
                address(this),
                address(this)
            );
        }

        uint256 wethBalance = weth.balanceOf(address(this));
        uint256 amountOut = 0;
        if (wethBalance > 1e9) {
            amountOut = UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(weth),
                address(usdc),
                500,
                address(this),
                wethBalance,
                0
            );
        }

        return amountOut;
    }

    function swapBalToDai() public returns (uint256){

        IERC20 bal = IERC20(0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8);
        IERC20 weth = IERC20(0x82aF49447D8a07e3bd95BD0d56f35241523fBab1);
        IERC20 usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);
        IERC20 dai = IERC20(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1);

        bytes32 balWethPoolId = 0xcc65a812ce382ab909a11e434dbf75b34f1cc59d000200000000000000000001;

        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);
        IVault vault = IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);

        uint256 balBalance = bal.balanceOf(address(this));
        if (balBalance > 0) {
            BalancerLibrary.swap(
                vault,
                IVault.SwapKind.GIVEN_IN,
                address(bal),
                address(weth),
                balWethPoolId,
                balBalance,
                0,
                address(this),
                address(this)
            );
        }

        uint256 wethBalance = weth.balanceOf(address(this));
        uint256 amountOut = 0;
        if (wethBalance > 1e9) {
            amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(weth),
                address(usdc),
                address(dai),
                500,
                100,
                address(this),
                wethBalance,
                0
            );
        }

        return amountOut;
    }
}
