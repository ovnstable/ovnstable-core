// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";

contract PancakeCLZap is OdosZap {
    INonfungiblePositionManager public npm;

    event TokenId(uint256 tokenId); // name..?

    struct ZapParams {
        address odosRouter;
        address npm;
    }

    struct PancakeCLZapInParams {
        address pair;
        uint256[] priceRange;
        uint256[] amountsOut;
        int24 tickDelta;
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

    function zapIn(SwapData memory swapData, PancakeCLZapInParams memory pancakeData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IPancakeV3Pool pool = IPancakeV3Pool(pancakeData.pair);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pool.token0();
        tokensOut[1] = pool.token1();

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (pancakeData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), pancakeData.amountsOut[i]);
            }

            pancakeData.amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(pancakeData);
    }

    function getProportion(
        PancakeCLZapInParams memory pancakeData
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {

        IPancakeV3Pool pool = IPancakeV3Pool(pancakeData.pair);
        uint256 dec0 = 10 ** IERC20Metadata(pool.token0()).decimals();
        uint256 dec1 = 10 ** IERC20Metadata(pool.token1()).decimals();
        (uint160 sqrtRatioX96, int24 tick,,,,,) = pool.slot0();
        int24 tickSpacing = pool.tickSpacing();
        int24 lowerTick;
        int24 upperTick;

        if(pancakeData.tickDelta == 0) {
            (lowerTick, upperTick) = Util.priceToTicks(pancakeData.priceRange, dec0, pool.tickSpacing());
        } else {
            int24 offset = tick > 0 ? int24(1) : int24(0);
            lowerTick = tick / tickSpacing * tickSpacing - tickSpacing * ((pancakeData.tickDelta + 1 - offset) / 2);
            upperTick = tick / tickSpacing * tickSpacing + tickSpacing * ((pancakeData.tickDelta + offset) / 2); 
        }

        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(lowerTick);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(upperTick);

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);

        denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }

    function _addLiquidity(PancakeCLZapInParams memory pancakeData) internal {

        IPancakeV3Pool pool = IPancakeV3Pool(pancakeData.pair);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pool.token0();
        tokensOut[1] = pool.token1();

        ResultOfLiquidity memory result;

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(npm), pancakeData.amountsOut[0]);
        asset1.approve(address(npm), pancakeData.amountsOut[1]);

        result.amountAsset0Before = asset0.balanceOf(address(this));
        result.amountAsset1Before = asset1.balanceOf(address(this));

        int24 lowerTick;
        int24 upperTick;
        int24 tickSpacing = pool.tickSpacing();
        (, int24 tick,,,,,) = pool.slot0();

        if (pancakeData.tickDelta == 0) {
            (lowerTick, upperTick) = Util.priceToTicks(pancakeData.priceRange, 10 ** IERC20Metadata(tokensOut[0]).decimals(), tickSpacing);
        } else {
            int24 offset = tick > 0 ? int24(1) : int24(0);
            lowerTick = tick / tickSpacing * tickSpacing - tickSpacing * ((pancakeData.tickDelta + 1 - offset) / 2);
            upperTick = tick / tickSpacing * tickSpacing + tickSpacing * ((pancakeData.tickDelta + offset) / 2); 
        }

        (uint256 tokenId,,,) = npm.mint(MintParams(tokensOut[0], tokensOut[1], pool.fee(),
            lowerTick, upperTick, pancakeData.amountsOut[0], pancakeData.amountsOut[1], 0, 0, msg.sender, block.timestamp));

        emit TokenId(tokenId);

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

    function getPriceFromTick(PancakeCLZapInParams memory pancakeData) public view returns (uint256 left, uint256 right) {
        IPancakeV3Pool pool = IPancakeV3Pool(pancakeData.pair);
        uint256 dec0 = 10 ** IERC20Metadata(pool.token0()).decimals();
        int24 tickSpacing = pool.tickSpacing();
        (, int24 tick,,,,,) = pool.slot0();

        int24 lowerTick = tick / tickSpacing * tickSpacing - (tickSpacing * (pancakeData.tickDelta / 2));
        int24 upperTick = tick + tickSpacing * ((pancakeData.tickDelta + 1) / 2);

        left = Util.getPriceBySqrtRatio(TickMath.getSqrtRatioAtTick(lowerTick), dec0);
        right = Util.getPriceBySqrtRatio(TickMath.getSqrtRatioAtTick(upperTick), dec0);
    }

    function getCurrentPrice(address pair) public view returns (uint256) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        uint256 dec0 = IERC20Metadata(pool.token0()).decimals();
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        return FullMath.mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
    }

    function getCurrentPriceInverted(address pair) public view returns (uint256) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        uint256 dec1 = IERC20Metadata(pool.token1()).decimals();
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        uint256 sqrtRatioX96Inverted = FullMath.mulDiv(uint256(2 ** 96), uint256(2 ** 96), uint256(sqrtRatioX96));
        return FullMath.mulDiv(uint256(sqrtRatioX96Inverted) * 10 ** dec1, uint256(sqrtRatioX96Inverted), 2 ** (96 + 96));
    }

    function getTickSpacing(address pair) public view returns (int24) {
        return IPancakeV3Pool(pair).tickSpacing();
    }
}