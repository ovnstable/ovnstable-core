// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Camelot.sol";
import "@overnight-contracts/connectors/contracts/stuff/Magpie.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library PendleRewardDaiGDaiLibrary {


    function claimSpecPnp() public {

        address[] memory stakingRewards = new address[](1);
        stakingRewards[0] = address(0xa0192f6567f8f5DC38C53323235FD08b318D2dcA); // lp

        address[] memory tokens = new address[](2);
        tokens[1] = address(0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8); // pendle

        address[][] memory rewardTokens = new address [][](1);
        rewardTokens[0] = tokens;

        MasterMagpie(address(0x0776C06907CE6Ff3d9Dbf84bA9B3422d7225942D)).multiclaimSpecPNP(stakingRewards, rewardTokens, true);
    }

    function swapPnpToDai() public returns(uint256) {
        IERC20 pnp = IERC20(0x2Ac2B254Bc18cD4999f64773a966E4f4869c34Ee);
        address dai = address(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1);
        address middleTokenWeth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);
        uint256 pnpBalance = pnp.balanceOf(address(this));
        uint256 amountOut = 0;

        if (pnpBalance > 0) {
            amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(pnp),
                middleTokenWeth,
                dai,
                10000,
                500,
                address(this),
                pnpBalance,
                0
            );
        }

        return amountOut;
    }


    function swapRewardToDai(IERC20 reward) public returns (uint256){

        address middleTokenWeth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
        uint256 rewardBalance = reward.balanceOf(address(this));
        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);
        address dai = address(0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1);

        uint256 amountOut = 0;
        if (rewardBalance > 0) {

            amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(reward),
                middleTokenWeth,
                dai,
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
