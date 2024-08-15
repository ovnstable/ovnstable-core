// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/KyberSwap.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

library KyberSwapRewardUsdcDaiLibrary {


    function swapOp() public returns(uint256){

        IERC20 op = IERC20(0x4200000000000000000000000000000000000042);
        IERC20 usdc = IERC20(0x7F5c764cBc14f9669B88837ca1490cCa17c31607);

        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);

        uint256 opBalance = op.balanceOf(address(this));

        if(opBalance > 0){

            return UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(op),
                address(usdc),
                100, // 0.01%
                address(this),
                opBalance,
                0
            );
        }

        return 0;
    }

    function swapKnc() public returns(uint256) {

        IERC20 knc = IERC20(0xa00E3A3511aAC35cA78530c85007AFCd31753819);
        IERC20 usdc = IERC20(0x7F5c764cBc14f9669B88837ca1490cCa17c31607);

        IERC20 wstETH = IERC20(0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb);
        IERC20 weth = IERC20(0x4200000000000000000000000000000000000006);

        ISwapRouter uniswapV3Router = ISwapRouter(0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45);

        uint256 kncBalance = knc.balanceOf(address(this));

        if (kncBalance > 0) {

            IRouter kyberRouter = IRouter(0xF9c2b5746c946EF883ab2660BbbB1f10A5bdeAb4);

            KyberswapLibrary.singleSwap(
                kyberRouter,
                address(knc),
                address(wstETH),
                1000,
                address(this),
                kncBalance,
                0
            );

            uint256 wstETHBalance = wstETH.balanceOf(address(this));

            return UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(wstETH),
                address(weth),
                address(usdc),
                100,
                500,
                address(this),
                wstETHBalance,
                0
            );

        }

        return 0;
    }



}
