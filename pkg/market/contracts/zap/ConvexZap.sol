// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";

import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

import "hardhat/console.sol";

contract ConvexZap is OdosZap {

    struct ZapParams {
        address odosRouter;
    }

    struct CurveZapInParams {
        address pair;
        uint256[] amountsOut;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.odosRouter != address(0), "Zero address not allowed");
        odosRouter = params.odosRouter;
    }

    function getProportion(
        address _pair
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IStableSwapPool pair = IStableSwapPool(_pair);
        uint256 reserve0 = pair.balances(0);
        uint256 reserve1 = pair.balances(1);
        address token0 = pair.coins(0);
        address token1 = pair.coins(1);
        uint256 dec0 = IERC20Metadata(token0).decimals();
        uint256 dec1 = IERC20Metadata(token1).decimals();
        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);

        token0Amount = reserve0 * (denominator / (10 ** dec0));
        token1Amount = reserve1 * (denominator / (10 ** dec1));
    }

    function zapIn(SwapData memory swapData, CurveZapInParams memory curveData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IStableSwapPool pair = IStableSwapPool(curveData.pair);
        address token0 = pair.coins(0);
        address token1 = pair.coins(1);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = token0;
        tokensOut[1] = token1;
        uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (curveData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), curveData.amountsOut[i]);
            }
            amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(pair, tokensOut, amountsOut);
        _returnToUser(pair);
    }

    function _addLiquidity(IStableSwapPool pair, address[] memory tokensOut, uint256[] memory amountsOut) internal {
        uint256 reserve0 = pair.balances(0);
        uint256 reserve1 = pair.balances(1);
        (uint256 tokensAmount0, uint256 tokensAmount1) = _getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            10 ** IERC20Metadata(tokensOut[0]).decimals(),
            10 ** IERC20Metadata(tokensOut[1]).decimals()
        );

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(pair), tokensAmount0);
        asset1.approve(address(pair), tokensAmount1);

        uint256 amountAsset0Before = asset0.balanceOf(address(this));
        uint256 amountAsset1Before = asset1.balanceOf(address(this));

        pair.add_liquidity(
            [tokensAmount0, tokensAmount1],
            OvnMath.subBasisPoints(pair.calc_token_amount([tokensAmount0, tokensAmount1], true), stakeSlippageBP)
        );

        uint256 amountAsset0After = asset0.balanceOf(address(this));
        uint256 amountAsset1After = asset1.balanceOf(address(this));

        if (amountAsset0After > 0) {
            asset0.transfer(msg.sender, amountAsset0After);
        }

        if (amountAsset1After > 0) {
            asset1.transfer(msg.sender, amountAsset1After);
        }

        uint256[] memory amountsPut = new uint256[](2);
        amountsPut[0] = amountAsset0Before - amountAsset0After;
        amountsPut[1] = amountAsset1Before - amountAsset1After;

        uint256[] memory amountsReturned = new uint256[](2);
        amountsReturned[0] = amountAsset0After;
        amountsReturned[1] = amountAsset1After;
        emit PutIntoPool(amountsPut, tokensOut);
        emit ReturnedToUser(amountsReturned, tokensOut);
    }

    function _returnToUser(IStableSwapPool pair) internal {
        uint256 poolBalance = pair.balanceOf(address(this));
        pair.transfer(msg.sender, poolBalance);
    }
}
