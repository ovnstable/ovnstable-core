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

    struct AerodromeCLZapInParams {
        address pair;
        int24[] tickRange;
        uint256[] amountsOut;
    }

    struct InputSwapToken {
        address tokenAddress;
        uint256 amount;
        uint256 price;
    }

    struct ResultOfProportion {
        address[] inputTokenAddresses;
        uint256[] inputTokenAmounts;
        address[] outputTokenAddresses;
        uint256[] outputTokenProportions;
        uint256[] outputTokenAmounts;
    }

    struct ResultOfLiquidity {
        uint amountAsset0Before;
        uint amountAsset1Before;

        uint amountAsset0After;
        uint amountAsset1After;

        uint[] amountsPut;
        uint[] amountsReturned;
    }

    struct OutTokenInfo {
        uint256 idx;
        uint256 amount;
        uint256 prop;
        uint256 sumProp;
        uint256 propAmount;
        uint256 amountToSwap;
        uint256 outAmount;
        uint256 price;
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

        int24 tickSpacing = pool.tickSpacing();
        (uint256 tokenId,,,) = npm.mint(INonfungiblePositionManager.MintParams(tokensOut[0], tokensOut[1], tickSpacing,
            aerodromeData.tickRange[0], aerodromeData.tickRange[1], aerodromeData.amountsOut[0], aerodromeData.amountsOut[1], 0, 0, msg.sender, block.timestamp, 0));

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

    function _getProportion(IUniswapV3Pool pool, int24[] memory tickRange) internal view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
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

    uint256 internal constant BASE_DIV = 1000000;

    function getProportionForZap(address pair, int24[] memory tickRange, InputSwapToken[] memory inputTokens, uint256[] memory outputTokenPrices)
    public view returns (ResultOfProportion memory) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        IERC20Metadata[] memory tokens = new IERC20Metadata[](inputTokens.length);
        OutTokenInfo[] memory outTokens = new OutTokenInfo[](2);
        uint256 sumInputs;
        uint256 denominator;
        uint256 i;
        ResultOfProportion memory result;

        outTokens[0].idx = inputTokens.length;
        outTokens[1].idx = inputTokens.length;
        outTokens[0].price = outputTokenPrices[0];
        outTokens[1].price = outputTokenPrices[1];

        for (i = 0; i < inputTokens.length; i++) {
            tokens[i] = IERC20Metadata(inputTokens[i].tokenAddress);
            if (denominator < tokens[i].decimals()) {
                denominator = tokens[i].decimals();
            }
            if (inputTokens[i].tokenAddress == pool.token0()) {
                outTokens[0].idx = i;
            } else if (inputTokens[i].tokenAddress == pool.token1()) {
                outTokens[1].idx = i;
            }
        }
        uint256 usdAmount;
        for (i = 0; i < inputTokens.length; i++) {
            usdAmount = inputTokens[i].price * inputTokens[i].amount * 10 ** (denominator - tokens[i].decimals());
            sumInputs += usdAmount;
            if (outTokens[0].idx == i) {
                outTokens[0].amount = usdAmount;
            } else if (outTokens[1].idx == i) {
                outTokens[1].amount = usdAmount;
            }
        }

        (outTokens[0].propAmount, outTokens[1].propAmount,) = _getProportion(pool, tickRange);
        outTokens[0].prop = outTokens[0].propAmount * getCurrentPrice(pair);
        outTokens[1].prop = outTokens[0].prop + outTokens[1].propAmount * BASE_DIV;
        outTokens[0].sumProp = FullMath.mulDiv(sumInputs, outTokens[0].prop, outTokens[1].prop);
        outTokens[1].sumProp = sumInputs - outTokens[0].sumProp;

        result.inputTokenAddresses = new address[](inputTokens.length);
        result.inputTokenAmounts = new uint256[](inputTokens.length);
        result.outputTokenAddresses = new address[](2);
        result.outputTokenProportions = new uint256[](2);
        result.outputTokenAmounts = new uint256[](2);

        for (i = 0; i < inputTokens.length; i++) {
            if (outTokens[0].idx != i && outTokens[1].idx != i) {
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = inputTokens[i].amount;
            }
            else if (outTokens[0].idx == i && outTokens[0].sumProp < outTokens[0].amount) {
                outTokens[0].amountToSwap = (outTokens[0].amount - outTokens[0].sumProp) /
                    (inputTokens[outTokens[0].idx].price * 10 ** (denominator - tokens[outTokens[0].idx].decimals()));
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = outTokens[0].amountToSwap;
            }
            else if (outTokens[1].idx == i && outTokens[1].sumProp < outTokens[1].amount) {
                outTokens[1].amountToSwap = (outTokens[1].amount - outTokens[1].sumProp) /
                    (inputTokens[outTokens[1].idx].price * 10 ** (denominator - tokens[outTokens[1].idx].decimals()));
                result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
                result.inputTokenAmounts[i] = outTokens[1].amountToSwap;
            }
        }
        if (outTokens[0].idx < inputTokens.length && outTokens[0].sumProp < outTokens[0].amount) {
            result.outputTokenAddresses[0] = pool.token1();
            result.outputTokenProportions[0] = BASE_DIV;
            result.outputTokenAmounts[0] = inputTokens[outTokens[0].idx].amount - outTokens[0].amountToSwap;
            result.outputTokenAmounts[1] = outTokens[1].idx < inputTokens.length ? inputTokens[outTokens[1].idx].amount : 0;
            return result;
        }
        if (outTokens[1].idx < inputTokens.length && outTokens[1].sumProp < outTokens[1].amount) {
            result.outputTokenAddresses[0] = pool.token0();
            result.outputTokenProportions[0] = BASE_DIV;
            result.outputTokenAmounts[0] = inputTokens[outTokens[1].idx].amount - outTokens[1].amountToSwap;
            result.outputTokenAmounts[1] = outTokens[0].idx < inputTokens.length ? inputTokens[outTokens[0].idx].amount : 0;
            return result;
        }
        if (outTokens[0].idx < inputTokens.length &&
        outTokens[0].sumProp == outTokens[0].amount &&
        outTokens[1].idx < inputTokens.length &&
        outTokens[1].sumProp == outTokens[1].amount &&
            (outTokens[0].prop == 0 || outTokens[0].prop == outTokens[1].prop)) {
            for (i = 0; i < inputTokens.length; i++) {
                result.inputTokenAddresses[i] = address(0);
                result.inputTokenAmounts[i] = 0;
                if (i < 2) {
                    result.outputTokenAddresses[i] = address(0);
                    result.outputTokenProportions[i] = 0;
                }
            }
            result.outputTokenAmounts[0] = inputTokens[outTokens[0].idx].amount;
            result.outputTokenAmounts[1] = inputTokens[outTokens[1].idx].amount;
            return result;
        }

        result.outputTokenAddresses[0] = pool.token0();
        result.outputTokenAddresses[1] = pool.token1();
        result.outputTokenProportions[0] = FullMath.mulDiv(outTokens[0].sumProp - outTokens[0].amount, BASE_DIV,
            (outTokens[0].sumProp + outTokens[1].sumProp) - (outTokens[0].amount + outTokens[1].amount));
        result.outputTokenProportions[1] = BASE_DIV - result.outputTokenProportions[0];
        result.outputTokenAmounts[0] = outTokens[0].idx < inputTokens.length ? inputTokens[outTokens[0].idx].amount : 0;
        result.outputTokenAmounts[1] = outTokens[1].idx < inputTokens.length ? inputTokens[outTokens[1].idx].amount : 0;
        return result;
    }

    function getCurrentPrice(address pair) public view returns (uint256) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        uint256 dec0 = IERC20Metadata(pool.token0()).decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();
        return FullMath.mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
    }

//    function getPriceFromTick(AerodromeCLZapInParams memory aerodromeData) public view returns (uint256 left, uint256 right) {
//        IUniswapV3Pool pool = IUniswapV3Pool(aerodromeData.pair);
//        uint256 dec0 = 10 ** IERC20Metadata(pool.token0()).decimals();
//        int24 tickSpacing = pool.tickSpacing();
//        (, int24 tick,,,,) = pool.slot0();
//
//        int24 lowerTick = tick / tickSpacing * tickSpacing - (tickSpacing * (aerodromeData.tickDelta / 2));
//        int24 upperTick = tick + tickSpacing * ((aerodromeData.tickDelta + 1) / 2);
//
//        left = Util.getPriceBySqrtRatio(TickMath.getSqrtRatioAtTick(lowerTick), dec0);
//        right = Util.getPriceBySqrtRatio(TickMath.getSqrtRatioAtTick(upperTick), dec0);
//    }

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
