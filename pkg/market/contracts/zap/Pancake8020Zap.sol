// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";

contract Pancake8020Zap is OdosZap {
    INonfungiblePositionManager public npm;
    
    struct ZapParams {
        address odosRouter;
        address npm;
    }

    struct PancakeEqualZapInParams {
        address pair;
        uint256[] amountsOut;
    }

    struct ResultOfLiquidity {
        uint amountAsset0Before;
        uint amountAsset1Before;

        uint amountAsset0After;
        uint amountAsset1After;

        uint[] amountsPut;
        uint[] amountsReturned;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.odosRouter != address(0), "Zero address not allowed");
        require(params.npm != address(0), "Zero address not allowed");
        odosRouter = params.odosRouter;
        npm = INonfungiblePositionManager(params.npm);
    }

    function zapIn(SwapData memory swapData, PancakeEqualZapInParams memory pancakeEqualData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IPancakeV3Pool pair = IPancakeV3Pool(pancakeEqualData.pair);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pair.token0();
        tokensOut[1] = pair.token1();
        uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (pancakeEqualData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), pancakeEqualData.amountsOut[i]);
            }
            amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(pair, tokensOut, amountsOut);
    }

    function getProportion(
        address _pair
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IPancakeV3Pool pair = IPancakeV3Pool(_pair);
        IERC20Metadata token0 = IERC20Metadata(pair.token0());
        IERC20Metadata token1 = IERC20Metadata(pair.token1());

        uint256 dec0 = token0.decimals();
        uint256 dec1 = token1.decimals();
        
        (uint160 sqrtRatioX96,int24 tick,,,,,) = pair.slot0();
        int24 tickSpacing = pair.tickSpacing();

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(tick - 1 * tickSpacing),
            TickMath.getSqrtRatioAtTick(tick + 4 * tickSpacing),
            dec0 * 1000000,
            dec1 * 1000000
        );

        uint256 amount0 = uint256(SqrtPriceMath.getAmount0Delta(sqrtRatioX96, TickMath.getSqrtRatioAtTick(tick + 4 * tickSpacing), int128(liquidity)));
        uint256 amount1 = uint256(SqrtPriceMath.getAmount1Delta(TickMath.getSqrtRatioAtTick(tick - 1 * tickSpacing), sqrtRatioX96, int128(liquidity)));

        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
        token0Amount = amount0 * (denominator / (10 ** dec0));
        token1Amount = amount1 * (denominator / (10 ** dec1));
    }

    function _addLiquidity(IPancakeV3Pool pair, address[] memory tokensOut, uint256[] memory amountsOut) internal {

        (uint256 reserve0, uint256 reserve1, ) = getProportion(address(pair));

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
        asset0.approve(address(npm), tokensAmount0);
        asset1.approve(address(npm), tokensAmount1);

        (,int24 tick,,,,,) = pair.slot0();
        int24 tickSpacing = pair.tickSpacing();

        ResultOfLiquidity memory result;
        result.amountAsset0Before = asset0.balanceOf(address(this));
        result.amountAsset1Before = asset1.balanceOf(address(this));
        MintParams memory params = 
            MintParams(tokensOut[0], tokensOut[1], pair.fee(),
                tick-1*tickSpacing, tick+4*tickSpacing, tokensAmount0, tokensAmount1, 0, 0, msg.sender, block.timestamp);

        npm.mint(params);

        result.amountAsset0After = asset0.balanceOf(address(this));
        result.amountAsset1After = asset1.balanceOf(address(this));

        if (result.amountAsset0After > 0) {
            asset0.transfer(msg.sender, result.amountAsset0After);
        }

        if (result.amountAsset1After > 0) {
            asset1.transfer(msg.sender, result.amountAsset1After);
        }

        result.amountsPut = new uint256[](2);
        result.amountsPut[0] = result.amountAsset0Before - result.amountAsset0After;
        result.amountsPut[1] = result.amountAsset1Before - result.amountAsset1After;

        result.amountsReturned = new uint256[](2);
        result.amountsReturned[0] = result.amountAsset0After;
        result.amountsReturned[1] = result.amountAsset1After;

        emit PutIntoPool(result.amountsPut, tokensOut);
        emit ReturnedToUser(result.amountsReturned, tokensOut);
    }

}
