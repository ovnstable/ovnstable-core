// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AerodromeCLProportionsZap.sol";

contract AerodromeCLZap is OdosZap, AerodromeCLProportionsZap {
    INonfungiblePositionManager public npm;

    event TokenId(uint256 tokenId); // name..?

    struct ZapParams {
        address odosRouter;
        address npm;
    }

    struct AerodromeCLZapInParams {
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

    function zapIn(SwapData memory swapData, AerodromeCLZapInParams memory aerodromeData) external {
        _prepareSwap(swapData);
        _swap(swapData);

        IUniswapV3Pool pool = IUniswapV3Pool(aerodromeData.pair);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pool.token0();
        tokensOut[1] = pool.token1();
        // uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (aerodromeData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), aerodromeData.amountsOut[i]);
            }

            aerodromeData.amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(aerodromeData);
    }

    function _addLiquidity(AerodromeCLZapInParams memory aerodromeData) internal {

        IUniswapV3Pool pool = IUniswapV3Pool(aerodromeData.pair);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pool.token0();
        tokensOut[1] = pool.token1();

        ResultOfLiquidity memory result;

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(npm), aerodromeData.amountsOut[0]);
        asset1.approve(address(npm), aerodromeData.amountsOut[1]);

        result.amountAsset0Before = asset0.balanceOf(address(this));
        result.amountAsset1Before = asset1.balanceOf(address(this));

        int24 lowerTick;
        int24 upperTick;
        int24 tickSpacing = pool.tickSpacing();
        (, int24 tick,,,,) = pool.slot0();

        if (aerodromeData.tickDelta == 0) {
            (lowerTick, upperTick) = Util.priceToTicks(aerodromeData.priceRange, 10 ** IERC20Metadata(tokensOut[0]).decimals(), tickSpacing);
        } else {
            int24 offset = tick > 0 ? int24(1) : int24(0);
            lowerTick = tick / tickSpacing * tickSpacing - tickSpacing * ((aerodromeData.tickDelta + 1 - offset) / 2);
            upperTick = tick / tickSpacing * tickSpacing + tickSpacing * ((aerodromeData.tickDelta + offset) / 2);
        }

        (uint256 tokenId,,,) = npm.mint(INonfungiblePositionManager.MintParams(tokensOut[0], tokensOut[1], tickSpacing,
            lowerTick, upperTick, aerodromeData.amountsOut[0], aerodromeData.amountsOut[1], 0, 0, msg.sender, block.timestamp, 0));

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

    function getProportionForZap(address pair, int24[] memory tickRange, InputSwapToken[] memory inputTokens)
    public view returns (ResultOfProportion memory) {
        return _getProportionForZap(pair, tickRange, inputTokens);
    }

    function getPriceFromTick(AerodromeCLZapInParams memory aerodromeData) public view returns (uint256 left, uint256 right) {
        IUniswapV3Pool pool = IUniswapV3Pool(aerodromeData.pair);
        uint256 dec0 = 10 ** IERC20Metadata(pool.token0()).decimals();
        int24 tickSpacing = pool.tickSpacing();
        (, int24 tick,,,,) = pool.slot0();

        int24 lowerTick = tick / tickSpacing * tickSpacing - (tickSpacing * (aerodromeData.tickDelta / 2));
        int24 upperTick = tick + tickSpacing * ((aerodromeData.tickDelta + 1) / 2);

        left = Util.getPriceBySqrtRatio(TickMath.getSqrtRatioAtTick(lowerTick), dec0);
        right = Util.getPriceBySqrtRatio(TickMath.getSqrtRatioAtTick(upperTick), dec0);
    }

    function getCurrentPrice(address pair) public view returns (uint256) {
        return _getCurrentPrice(pair);
    }

    function getTickSpacing(address pair) public view returns (int24) {
        return IUniswapV3Pool(pair).tickSpacing();
    }

    function tickToPrice(address pair, int24 tick) public view returns (uint256) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        uint256 dec = 10 ** IERC20Metadata(pool.token0()).decimals();
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
        return Util.getPriceBySqrtRatio(sqrtRatioX96, dec);
    }

    function priceToClosestTick(address pair, uint256[] memory prices) public view returns (int24[] memory) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        uint256 dec = 10 ** IERC20Metadata(pool.token0()).decimals();
        int24 tickSpacing = pool.tickSpacing();

        int24[] memory closestTicks = new int24[](prices.length);
        for (uint256 i = 0; i < prices.length; i++) {
            uint160 sqrtRatioX96 = Util.getSqrtRatioByPrice(prices[i], dec);
            int24 currentTick = TickMath.getTickAtSqrtRatio(sqrtRatioX96);
            if (currentTick % tickSpacing == 0) {
                closestTicks[i] = currentTick;
            } else {
                closestTicks[i] = currentTick > 0 ? currentTick - currentTick % tickSpacing : currentTick - tickSpacing - (currentTick % tickSpacing);
            }
        }
        return closestTicks;
    }

    function getCurrentPoolTick(address pair) public view returns (int24 tick) {
        (, tick,,,,) = IUniswapV3Pool(pair).slot0();
    }

    function closestTicksForCurrentTick(address pair) public view returns (int24 left, int24 right) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        (, int24 tick,,,,) = pool.slot0();
        int24 tickSpacing = pool.tickSpacing();
        if (tick % tickSpacing == 0) {
            left = tick;
            right = tick + tickSpacing;
        } else {
            left = tick > 0 ? tick - tick % tickSpacing : tick - tickSpacing - (tick % tickSpacing);
            right = tick > 0 ? tick + tickSpacing - (tick % tickSpacing) : tick - (tick % tickSpacing);
        }
    }
}
