// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract AerodromeCLZap is OdosZap {
    INonfungiblePositionManager public npm;

    event TokenId(uint256 tokenId); // name..?

    struct ZapParams {
        address odosRouter;
        address npm;
    }

    struct InputSwapToken {
        address tokenAddress;
        uint256 amount;
        uint256 price;
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

    struct ResultOfProportion {
        address[] inputTokenAddresses;
        uint256[] inputTokenAmounts;
        address[] outputTokenAddresses;
        uint256[] outputTokenProportions;
        uint256[] outputTokenAmounts;
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

    function _getProportion(address pair, int24[] memory tickRange) internal view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        uint256 dec0 = 10 ** IERC20Metadata(pool.token0()).decimals();
        uint256 dec1 = 10 ** IERC20Metadata(pool.token1()).decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();

        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(tickRange[0]);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(tickRange[1]);
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);
        denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }

    function getProportionForZap(address pair, int24[] memory tickRange, InputSwapToken[] memory inputTokens)
            public view returns (ResultOfProportion memory) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        IERC20Metadata[] memory tokens = new IERC20Metadata[](inputTokens.length);
        uint256 dec0 = IERC20Metadata(pool.token0()).decimals();
        uint256 sumInputs;
        uint256 denominator;
        ResultOfProportion memory result;

        uint256[] memory tokenOutIdx = new uint256[](2);
        uint256[] memory tokenOut = new uint256[](2);
        tokenOutIdx[0] = inputTokens.length;
        tokenOutIdx[1] = inputTokens.length;

        for (uint256 i = 0; i < inputTokens.length; i++) {
            tokens[i] = IERC20Metadata(inputTokens[i].tokenAddress);
            if (denominator < tokens[i].decimals()) {
                denominator = tokens[i].decimals();
            }
            if (inputTokens[i].tokenAddress == pool.token0()) {
                tokenOutIdx[0] = i;
            } else if (inputTokens[i].tokenAddress == pool.token1()) {
                tokenOutIdx[1] = i;
            }
        }
        uint256 usdAmount;
        for (uint256 i = 0; i < inputTokens.length; i++) {
            usdAmount = inputTokens[i].price * inputTokens[i].amount * 10 ** (denominator - tokens[i].decimals());
            sumInputs += usdAmount;
            if (tokenOutIdx[0] == i) {
                tokenOut[0] = usdAmount;
            } else if (tokenOutIdx[1] == i) {
                tokenOut[1] = usdAmount;
            }
        }
        console.log("sumInputs", sumInputs);
        (uint256 token0Amount, uint256 token1Amount,) = _getProportion(pair, tickRange);
        console.log("token0Amount, token1Amount", token0Amount, token1Amount);
        uint256 currentPrice = getCurrentPrice(pair);
        console.log("currentPrice", currentPrice);
        uint256 prop0 = token0Amount * currentPrice;
        uint256 prop1 = prop0 + token1Amount * 10 ** dec0;
        console.log("prop0, prop1", prop0, prop1);
        uint256 output0InMoneyWithProportion = FullMath.mulDiv(sumInputs, prop0, prop1);
        console.log("output0InMoneyWithProportion", output0InMoneyWithProportion);
        uint256 output1InMoneyWithProportion = sumInputs - output0InMoneyWithProportion;
        console.log("output1InMoneyWithProportion", output1InMoneyWithProportion);
        console.log("token0, token1", tokenOut[0], tokenOut[1]);

        result.inputTokenAddresses = new address[](inputTokens.length);
        result.inputTokenAmounts = new uint256[](inputTokens.length);
        result.outputTokenAddresses = new address[](2);
        result.outputTokenProportions = new address[](2);
        result.outputTokenAmounts = new address[](2);
        uint256 tokenAmountToSwap;

        for (uint256 i = 0; i < inputTokens.length; i++) {
            if (tokenOutIdx[0] != i && tokenOutIdx[1] != i) {
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = inputTokens[i].amount;
            }
            else if (tokenOutIdx[0] == i && output0InMoneyWithProportion < tokenOut[0]) {
                tokenAmountToSwap = (tokenOut[0] - output0InMoneyWithProportion) /
                    (inputTokens[tokenOutIdx[0]].price * 10 ** (denominator - tokens[tokenOutIdx[0]].decimals()));
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = tokenAmountToSwap;
            }
            else if (tokenOutIdx[1] == i && output1InMoneyWithProportion < tokenOut[1]) {
                tokenAmountToSwap = (tokenOut[1] - output1InMoneyWithProportion) /
                    (inputTokens[tokenOutIdx[1]].price * 10 ** (denominator - tokens[tokenOutIdx[1]].decimals()));
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = tokenAmountToSwap;
            }
        }
        if (tokenOutIdx[0] < inputTokens.length && output0InMoneyWithProportion < tokenOut[0]) {
            result.outputTokenAddresses[0] = pool.token1();
            result.outputTokenProportions[0] = dec0;
            result.outputTokenAmounts[0] = inputTokens[tokenOutIdx[0]].amount - tokenAmountToSwap;
            result.outputTokenAmounts[1] = tokenOutIdx[1] < inputTokens.length ? inputTokens[tokenOutIdx[1]].amount : 0;
        }
        else if (tokenOutIdx[1] < inputTokens.length && output1InMoneyWithProportion < tokenOut[1]) {
            result.outputTokenAddresses[0] = pool.token0();
            result.outputTokenProportions[0] = dec0;
            result.outputTokenAmounts[0] = inputTokens[tokenOutIdx[1]].amount - tokenAmountToSwap;
            result.outputTokenAmounts[1] = tokenOutIdx[0] < inputTokens.length ? inputTokens[tokenOutIdx[0]].amount : 0;
        }
        else if (tokenOutIdx[0] < inputTokens.length &&
                output0InMoneyWithProportion == tokenOut[0] &&
                tokenOutIdx[1] < inputTokens.length &&
                output1InMoneyWithProportion == tokenOut[1] &&
                (prop0 == 0 || prop0 == prop1)) {
            for (uint256 i = 0; i < inputTokens.length; i++) {
                result.inputTokenAddresses[i] = address(0);
                result.inputTokenAmounts[i] = 0;
                if (i < 2) {
                    result.outputTokenAddresses[i] = address(0);
                    result.outputTokenProportions[i] = 0;
                }
            }
            result.outputTokenAmounts[0] = tokenOutIdx[0] < inputTokens.length ? inputTokens[tokenOutIdx[0]].amount : 0;
            result.outputTokenAmounts[1] = tokenOutIdx[1] < inputTokens.length ? inputTokens[tokenOutIdx[1]].amount : 0;
        }
        return result;
    }

//    function getProportion(
//        AerodromeCLZapInParams memory aerodromeData
//    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
//
//        IUniswapV3Pool pool = IUniswapV3Pool(aerodromeData.pair);
//        uint256 dec0 = 10 ** IERC20Metadata(pool.token0()).decimals();
//        uint256 dec1 = 10 ** IERC20Metadata(pool.token1()).decimals();
//        (uint160 sqrtRatioX96, int24 tick,,,,) = pool.slot0();
//        int24 tickSpacing = pool.tickSpacing();
//        int24 lowerTick;
//        int24 upperTick;
//
//        if (aerodromeData.tickDelta == 0) {
//            (lowerTick, upperTick) = Util.priceToTicks(aerodromeData.priceRange, dec0, pool.tickSpacing());
//        } else {
//            int24 offset = tick > 0 ? int24(1) : int24(0);
//            lowerTick = tick / tickSpacing * tickSpacing - tickSpacing * ((aerodromeData.tickDelta + 1 - offset) / 2);
//            upperTick = tick / tickSpacing * tickSpacing + tickSpacing * ((aerodromeData.tickDelta + offset) / 2);
//        }
//
//        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(lowerTick);
//        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(upperTick);
//
//        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
//        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);
//
//        denominator = dec0 > dec1 ? dec0 : dec1;
//
//        token0Amount = token0Amount * (denominator / dec0);
//        token1Amount = token1Amount * (denominator / dec1);
//    }

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
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        uint256 dec0 = IERC20Metadata(pool.token0()).decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();
        return FullMath.mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
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