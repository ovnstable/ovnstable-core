// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library EquilibriaRewardUsdcUsdtLibrary {


    function transferXEqbToTreasure() public {

        IERC20 xEqb = IERC20(0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E);

        uint256 balance = xEqb.balanceOf(address(this));
        if(balance > 0){
            xEqb.transfer(0x784Cf4b62655486B405Eb76731885CC9ed56f42f, balance);
        }
    }


    function swapEqbToUsdc() public {

        IERC20 eqb = IERC20(0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C);
        IERC20 usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);
        uint256 eqbBalance = eqb.balanceOf(address(this));

        if (eqbBalance > 0) {

            ICamelotRouter camelotRouter = ICamelotRouter(0xc873fEcbd354f5A56E00E710B90EF4201db2448d); // Camelot Router
            address middleTokenWeth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // WETH

            address[] memory path = new address[](3);
            path[0] = address(eqb);
            path[1] = middleTokenWeth; // WETH
            path[2] = address(usdc);

            uint256 amountOut = CamelotLibrary.getAmountsOut(
                camelotRouter,
                path,
                eqbBalance
            );

            if (amountOut > 0) {
                CamelotLibrary.pathSwap(
                    camelotRouter,
                    path,
                    eqbBalance,
                    0,
                    address(this)
                );
            }
        }
    }


    function swapRewardToUsdc(IERC20 reward) public returns (uint256){

        uint256 rewardBalance = reward.balanceOf(address(this));
        address middleTokenWeth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // WETH
        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);
        IERC20 usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);

        uint256 amountOut = 0;
        if (rewardBalance > 0) {

            amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(reward),
                middleTokenWeth,
                address(usdc),
                3000,
                500,
                address(this),
                rewardBalance,
                0
            );
        }

        return amountOut;
    }
}
