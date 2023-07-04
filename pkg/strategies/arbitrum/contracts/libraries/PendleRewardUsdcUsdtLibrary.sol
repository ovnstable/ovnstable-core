// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@overnight-contracts/connectors/contracts/stuff/Magpie.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library PendleRewardUsdcUsdtLibrary {


    function claimSpecPnp() public {

        address[] memory stakingRewards = new address[](1);
        stakingRewards[0] = address(0x0A21291A184cf36aD3B0a0def4A17C12Cbd66A14); // lp

        address[] memory tokens = new address[](2);
        tokens[0] = address(0x6694340fc020c5E6B96567843da2df01b2CE1eb6); // stg
        tokens[1] = address(0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8); // pendle

        address[][] memory rewardTokens = new address [][](1);
        rewardTokens[0] = tokens;

        MasterMagpie(address(0x0776C06907CE6Ff3d9Dbf84bA9B3422d7225942D)).multiclaimSpecPNP(stakingRewards, rewardTokens, false);
    }

    function swapPnpToUsdc() public returns(uint256) {

        IERC20 pnp = IERC20(0x2Ac2B254Bc18cD4999f64773a966E4f4869c34Ee);
        IERC20 usdc = IERC20(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);
        uint256 pnpBalance = pnp.balanceOf(address(this));

        if (pnpBalance > 0) {

            ICamelotRouter camelotRouter = ICamelotRouter(0xc873fEcbd354f5A56E00E710B90EF4201db2448d); // Camelot Router
            address middleTokenWeth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // WETH

            address[] memory path = new address[](3);
            path[0] = address(pnp);
            path[1] = middleTokenWeth; // WETH
            path[2] = address(usdc);

            uint256 amountOut = CamelotLibrary.getAmountsOut(
                camelotRouter,
                path,
                pnpBalance
            );

            if (amountOut > 0) {
                
                uint256 balanceUsdcBefore = usdc.balanceOf(address(this));
                CamelotLibrary.pathSwap(
                    camelotRouter,
                    path,
                    pnpBalance,
                    0,
                    address(this)
                );
                
                return usdc.balanceOf(address(this)) - balanceUsdcBefore;
            }
        }
        return 0;
    }


    function swapRewardToUsdc(IERC20 reward) public returns (uint256){

        address middleTokenWeth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        uint256 rewardBalance = reward.balanceOf(address(this));
        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);
        address usdc = address(0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8);

        uint256 amountOut = 0;
        if (rewardBalance > 0) {

            amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(reward),
                middleTokenWeth,
                usdc,
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
