// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./OdosZap.sol";

import "@overnight-contracts/connectors/contracts/stuff/Thena.sol";

contract ThenaZap is OdosZap {
    IRouter public thenaRouter;

    struct ZapParams {
        address thenaRouter;
        address odosRouter;
    }

    struct ThenaZapInParams {
        address gauge;
        uint256[] amountsOut;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.thenaRouter != address(0), "Zero address not allowed");
        require(params.odosRouter != address(0), "Zero address not allowed");

        thenaRouter = IRouter(params.thenaRouter);
        odosRouter = params.odosRouter;
    }

    function zapIn(SwapData memory swapData, ThenaZapInParams memory thenaData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IGaugeV2 gauge = IGaugeV2(thenaData.gauge);
        address _token = gauge.TOKEN();
        IPair pair = IPair(_token);
        (address token0, address token1) = pair.tokens();

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = token0;
        tokensOut[1] = token1;
        uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (thenaData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), thenaData.amountsOut[i]);
            }
            amountsOut[i] = asset.balanceOf(address(this));
            console.log("%s %s", tokensOut[i], amountsOut[i]);
        }

        _addLiquidity(pair, tokensOut, amountsOut);
        _transferToUser(pair);
    }

    function getProportion(
        address _gauge
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IGaugeV2 gauge = IGaugeV2(_gauge);
        address _token = gauge.TOKEN();
        IPair pair = IPair(_token);
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
        (address token0, address token1) = pair.tokens();
        uint256 dec0 = IERC20Metadata(token0).decimals();
        uint256 dec1 = IERC20Metadata(token1).decimals();
        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
        token0Amount = reserve0 * (denominator / (10 ** dec0));
        token1Amount = reserve1 * (denominator / (10 ** dec1));
    }

    function _addLiquidity(IPair pair, address[] memory tokensOut, uint256[] memory amountsOut) internal {
        (uint256 reserve0, uint256 reserve1, ) = pair.getReserves();
        (uint256 tokensAmount0, uint256 tokensAmount1) = getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            10 ** IERC20Metadata(tokensOut[0]).decimals(),
            10 ** IERC20Metadata(tokensOut[1]).decimals()
        );

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(thenaRouter), tokensAmount0);
        asset1.approve(address(thenaRouter), tokensAmount1);

        uint256 amountAsset0Before = asset0.balanceOf(address(this));
        uint256 amountAsset1Before = asset1.balanceOf(address(this));

        thenaRouter.addLiquidity(
            tokensOut[0],
            tokensOut[1],
            pair.stable(),
            tokensAmount0,
            tokensAmount1,
            OvnMath.subBasisPoints(tokensAmount0, stakeSlippageBP),
            OvnMath.subBasisPoints(tokensAmount1, stakeSlippageBP),
            address(this),
            block.timestamp
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

    function getAmountToSwap(
        uint256 amount0,
        uint256 amount1,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1
    ) internal pure returns (uint256 newAmount0, uint256 newAmount1) {
        if ((reserve0 * 100) / denominator0 > (reserve1 * 100) / denominator1) {
            newAmount1 = (reserve1 * amount0) / reserve0;
            // 18 + 6 - 6
            newAmount1 = newAmount1 > amount1 ? amount1 : newAmount1;
            newAmount0 = (newAmount1 * reserve0) / reserve1;
            // 18 + 6 - 18
        } else {
            newAmount0 = (reserve0 * amount1) / reserve1;
            newAmount0 = newAmount0 > amount0 ? amount0 : newAmount0;
            newAmount1 = (newAmount0 * reserve1) / reserve0;
        }
    }

    function _transferToUser(IPair pair) internal {
        uint256 pairBalance = pair.balanceOf(address(this));
        pair.approve(address(msg.sender), pairBalance);
        pair.transferFrom(address(this), address(msg.sender), pairBalance);
    }
}
