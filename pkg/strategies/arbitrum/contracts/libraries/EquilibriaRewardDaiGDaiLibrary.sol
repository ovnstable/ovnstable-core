// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library EquilibriaRewardDaiGDaiLibrary {


    function transferXEqbToTreasure() public {

        IERC20 xEqb = IERC20(0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E);

        uint256 balance = xEqb.balanceOf(address(this));
        if(balance > 0){
            xEqb.transfer(0x784Cf4b62655486B405Eb76731885CC9ed56f42f, balance);
        }
    }


    function swapEqbToDai() public returns (uint256) {

        IERC20 eqb = IERC20(0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C);
        uint256 eqbBalance = eqb.balanceOf(address(this));
        IERC20 dai = IERC20(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1);

        if (eqbBalance > 0) {

            ICamelotRouter camelotRouter = ICamelotRouter(0xc873fEcbd354f5A56E00E710B90EF4201db2448d); // Camelot Router

            address[] memory path = new address[](4);
            path[0] = address(eqb);
            path[1] = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // WETH
            path[2] = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8; // USDC
            path[3] = address(dai); // DAI

            uint256 amountOut = CamelotLibrary.getAmountsOut(
                camelotRouter,
                path,
                eqbBalance
            );

            if (amountOut > 0) {

                uint256 balanceDaiBefore = dai.balanceOf(address(this));
                CamelotLibrary.pathSwap(
                    camelotRouter,
                    path,
                    eqbBalance,
                    0,
                    address(this)
                );
                return dai.balanceOf(address(this)) - balanceDaiBefore;
            }
        }

        return 0;
    }

    function swapPendleToDai() public returns (uint256){

        address middleTokenWeth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        IERC20 pendle = IERC20(0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8);
        IERC20 dai = IERC20(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1);

        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);

        uint256 pendleBalance = pendle.balanceOf(address(this));
        if (pendleBalance > 0) {

            uint256 amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(pendle),
                middleTokenWeth,
                address(dai),
                3000,
                500,
                address(this),
                pendleBalance,
                0
            );

            return amountOut;
        }

        return 0;
    }
}
