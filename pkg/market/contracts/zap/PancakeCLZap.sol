// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";

contract PancakeCLZap is OdosZap {
    uint256 internal constant BASE_DIV = 1000000;

    INonfungiblePositionManager public npm;

    event TokenId(uint256 tokenId); // name..?

    struct ZapParams {
        address odosRouter;
        address npm;
    }

    struct PancakeCLZapInParams {
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
        uint256[] poolProportionsUsd;
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
        uint256 amountUsd;
        uint256 prop;
        uint256 propAmount;
        uint256 amountToSwap;
        uint256 outAmount;
        address token;
    }

    function setParams(ZapParams memory params) external onlyAdmin {
        require(params.odosRouter != address(0), "!0 addr");
        require(params.npm != address(0), "!0 addr");
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

        (uint256 tokenId,,,) = npm.mint(MintParams(tokensOut[0], tokensOut[1], pool.fee(),
            pancakeData.tickRange[0], pancakeData.tickRange[1], pancakeData.amountsOut[0], pancakeData.amountsOut[1], 0, 0, msg.sender, block.timestamp));

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

    function _getProportion(IPancakeV3Pool pool, int24[] memory tickRange) internal view returns (uint256 token0Amount, uint256 token1Amount) {
        uint256 dec0 = 10 ** IERC20Metadata(pool.token0()).decimals();
        uint256 dec1 = 10 ** IERC20Metadata(pool.token1()).decimals();
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();

        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(tickRange[0]);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(tickRange[1]);

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);

        uint256 denominator = dec0 > dec1 ? dec0 : dec1;

        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }

    function getProportionForZap(address pair, int24[] memory tickRange, InputSwapToken[] memory inputTokens)
    public view returns (ResultOfProportion memory result) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        uint8[] memory decimals = new uint8[](inputTokens.length);
        OutTokenInfo[] memory outTokens = new OutTokenInfo[](2);
        uint256 sumInputsUsd;

        outTokens[0].idx = inputTokens.length;
        outTokens[1].idx = inputTokens.length;
        outTokens[0].token = pool.token0();
        outTokens[1].token = pool.token1();

        result.inputTokenAddresses = new address[](inputTokens.length);
        result.inputTokenAmounts = new uint256[](inputTokens.length);
        result.outputTokenAddresses = new address[](2);
        result.outputTokenProportions = new uint256[](2);
        result.outputTokenAmounts = new uint256[](2);
        result.poolProportionsUsd = new uint256[](2);

        for (uint256 i = 0; i < inputTokens.length; i++) {
            decimals[i] = IERC20Metadata(inputTokens[i].tokenAddress).decimals();
            uint256 amountUsd = FullMath.mulDiv(inputTokens[i].price, inputTokens[i].amount, 10 ** decimals[i]);
            sumInputsUsd += amountUsd;
            if (inputTokens[i].tokenAddress == outTokens[0].token) {
                outTokens[0].idx = i;
                outTokens[0].amountUsd = amountUsd;
                continue;
            }
            if (inputTokens[i].tokenAddress == outTokens[1].token) {
                outTokens[1].idx = i;
                outTokens[1].amountUsd = amountUsd;
                continue;
            }
            // front (!)
            result.inputTokenAddresses[i] = inputTokens[i].tokenAddress;
            result.inputTokenAmounts[i] = inputTokens[i].amount;
        }

        (outTokens[0].propAmount, outTokens[1].propAmount) = _getProportion(pool, tickRange);
        outTokens[0].prop = outTokens[0].propAmount * getCurrentPrice(pair);
        outTokens[1].prop = outTokens[0].prop + outTokens[1].propAmount * (10 ** IERC20Metadata(outTokens[1].token).decimals());
        result.poolProportionsUsd[0] = FullMath.mulDiv(sumInputsUsd, outTokens[0].prop, outTokens[1].prop);
        result.poolProportionsUsd[1] = sumInputsUsd - result.poolProportionsUsd[0];
        result.outputTokenAmounts[0] = outTokens[0].idx < inputTokens.length ? inputTokens[outTokens[0].idx].amount : 0;
        result.outputTokenAmounts[1] = outTokens[1].idx < inputTokens.length ? inputTokens[outTokens[1].idx].amount : 0;

        console.log(result.poolProportionsUsd[0], result.poolProportionsUsd[1]);
        console.log(outTokens[0].amountUsd, outTokens[1].amountUsd);
        console.log(outTokens[0].prop, outTokens[1].prop);
        if (result.poolProportionsUsd[0] == outTokens[0].amountUsd && result.poolProportionsUsd[1] == outTokens[1].amountUsd &&
            (outTokens[0].prop == 0 || outTokens[0].prop == outTokens[1].prop)) {
            delete result.inputTokenAddresses;
            delete result.inputTokenAmounts;
            return result;
        }

        for (uint256 i = 0; i < 2; i++) {
            if (outTokens[i].idx < inputTokens.length && result.poolProportionsUsd[i] < outTokens[i].amountUsd) {
                outTokens[i].amountToSwap = FullMath.mulDiv(outTokens[i].amountUsd - result.poolProportionsUsd[i], 10 ** decimals[outTokens[i].idx], inputTokens[outTokens[i].idx].price);
                result.inputTokenAddresses[outTokens[i].idx] = inputTokens[outTokens[i].idx].tokenAddress;
                result.inputTokenAmounts[outTokens[i].idx] = outTokens[i].amountToSwap;
                result.outputTokenAddresses[0] = i == 0 ? outTokens[1].token : outTokens[0].token;
                // front (!)
                result.outputTokenProportions[0] = BASE_DIV;
                result.outputTokenAmounts[i] = inputTokens[outTokens[i].idx].amount - outTokens[i].amountToSwap;
                return result;
            }
        }

        result.outputTokenAddresses[0] = outTokens[0].token;
        result.outputTokenAddresses[1] = outTokens[1].token;
        result.outputTokenProportions[0] = FullMath.mulDiv(result.poolProportionsUsd[0] - outTokens[0].amountUsd, BASE_DIV,
            (result.poolProportionsUsd[0] + result.poolProportionsUsd[1]) - (outTokens[0].amountUsd + outTokens[1].amountUsd));
        result.outputTokenProportions[1] = BASE_DIV - result.outputTokenProportions[0];
        return result;
    }

    function getCurrentPrice(address pair) public view returns (uint256) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        uint256 dec0 = IERC20Metadata(pool.token0()).decimals();
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        return FullMath.mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
    }

    function getTickSpacing(address pair) public view returns (int24) {
        return IPancakeV3Pool(pair).tickSpacing();
    }

    function tickToPrice(address pair, int24 tick) public view returns (uint256) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        uint256 dec = 10 ** IERC20Metadata(pool.token0()).decimals();
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
        return Util.getPriceBySqrtRatio(sqrtRatioX96, dec);
    }

    function priceToClosestTick(address pair, uint256[] memory prices) public view returns (int24[] memory) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        uint256 dec = 10 ** IERC20Metadata(pool.token0()).decimals();
        int24 tickSpacing = pool.tickSpacing();

        int24[] memory closestTicks = new int24[](prices.length);
        for (uint256 i = 0; i < prices.length; i++) {
            uint160 sqrtRatioX96 = Util.getSqrtRatioByPrice(prices[i], dec);
            int24 currentTick = TickMath.getTickAtSqrtRatio(sqrtRatioX96);
            if (currentTick % tickSpacing >= 0) {
                closestTicks[i] = currentTick - currentTick % tickSpacing;
            } else {
                closestTicks[i] = currentTick - tickSpacing - (currentTick % tickSpacing);
            }
        }
        return closestTicks;
    }

    function getCurrentPoolTick(address pair) public view returns (int24 tick) {
        (, tick,,,,,) = IPancakeV3Pool(pair).slot0();
    }

    function closestTicksForCurrentTick(address pair) public view returns (int24 left, int24 right) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        (, int24 tick,,,,,) = pool.slot0();
        int24 tickSpacing = pool.tickSpacing();
        if (tick % tickSpacing >= 0) {
            left = tick - tick % tickSpacing;
            right = tick + tickSpacing - (tick % tickSpacing);
        } else {
            left = tick - tickSpacing - (tick % tickSpacing);
            right = tick - (tick % tickSpacing);
        }
    }
}
