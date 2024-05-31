// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./OdosZap.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract AerodromeCLZap is OdosZap {
    INonfungiblePositionManager public npm;
    
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

        IUniswapV3Pool pair = IUniswapV3Pool(aerodromeData.pair);

        address[] memory tokensOut = new address[](2);
        tokensOut[0] = pair.token0();
        tokensOut[1] = pair.token1();
        uint256[] memory amountsOut = new uint256[](2);

        for (uint256 i = 0; i < tokensOut.length; i++) {
            IERC20 asset = IERC20(tokensOut[i]);

            if (aerodromeData.amountsOut[i] > 0) {
                asset.transferFrom(msg.sender, address(this), aerodromeData.amountsOut[i]);
            }

            amountsOut[i] = asset.balanceOf(address(this));
        }

        _addLiquidity(pair, tokensOut, amountsOut, aerodromeData.priceRange, aerodromeData.tickDelta);
    }

    function _priceToTicks(uint256[] memory priceRange, uint256 dec0, int24 tickSpacing) internal pure returns(int24 lowerTick, int24 upperTick) {

        lowerTick = TickMath.getTickAtSqrtRatio(Util.getSqrtRatioByPrice(priceRange[0], dec0));
        upperTick = TickMath.getTickAtSqrtRatio(Util.getSqrtRatioByPrice(priceRange[1], dec0));

        if (lowerTick % tickSpacing != 0) {
            lowerTick = lowerTick > 0 ? lowerTick - lowerTick % tickSpacing : lowerTick - tickSpacing - (lowerTick % tickSpacing);
        }
        if (upperTick % tickSpacing != 0) {
            upperTick = upperTick > 0 ? upperTick + tickSpacing - (upperTick % tickSpacing) : upperTick - (upperTick % tickSpacing);
        }
    }

    function getProportion(
        AerodromeCLZapInParams memory aerodromeData
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {

        IUniswapV3Pool pair = IUniswapV3Pool(aerodromeData.pair);
        uint256 dec0 = 10 ** IERC20Metadata(pair.token0()).decimals();
        uint256 dec1 = 10 ** IERC20Metadata(pair.token1()).decimals();
        (uint160 sqrtRatioX96, int24 tick,,,,) = pair.slot0();
        int24 tickSpacing = pair.tickSpacing();
        int24 lowerTick; 
        int24 upperTick;

        if(aerodromeData.tickDelta == 0) {
            (lowerTick, upperTick) = _priceToTicks(aerodromeData.priceRange, dec0, pair.tickSpacing());
        } else {
            lowerTick = tick / tickSpacing * tickSpacing;
            upperTick = lowerTick + tickSpacing;
        }
        
        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(lowerTick);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(upperTick);
        
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);

        denominator = dec0 > dec1 ? dec0 : dec1;
        
        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }

    function _addLiquidity(IUniswapV3Pool pair, address[] memory tokensOut, uint256[] memory amountsOut, uint256[] memory priceRange, int24 tickDelta) internal {
        
        ResultOfLiquidity memory result;
        
        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(npm), amountsOut[0]);
        asset1.approve(address(npm), amountsOut[1]);

        result.amountAsset0Before = asset0.balanceOf(address(this));
        result.amountAsset1Before = asset1.balanceOf(address(this));

        int24 tickSpacing = pair.tickSpacing();
        (int24 lowerTick, int24 upperTick) = _priceToTicks(priceRange, 10 ** IERC20Metadata(tokensOut[0]).decimals(), tickSpacing);

        npm.mint(INonfungiblePositionManager.MintParams(tokensOut[0], tokensOut[1], tickSpacing,
            lowerTick, upperTick, amountsOut[0], amountsOut[1], 0, 0, msg.sender, block.timestamp, 0));
        
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


    function getProportionForTicks(address _pair, int24[] memory ticks) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IUniswapV3Pool pair = IUniswapV3Pool(_pair);
        uint256 dec0 = 10 ** IERC20Metadata(pair.token0()).decimals();
        uint256 dec1 = 10 ** IERC20Metadata(pair.token1()).decimals();
        (uint160 sqrtRatioX96,,,,,) = pair.slot0();
        
        
        uint160 sqrtRatio0 = TickMath.getSqrtRatioAtTick(ticks[0]);
        uint160 sqrtRatio1 = TickMath.getSqrtRatioAtTick(ticks[1]);
        
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatio0, sqrtRatio1, dec0 * 1000, dec1 * 1000);
        (token0Amount, token1Amount) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatio0, sqrtRatio1, liquidity);

        denominator = dec0 > dec1 ? dec0 : dec1;
        
        token0Amount = token0Amount * (denominator / dec0);
        token1Amount = token1Amount * (denominator / dec1);
    }

    function getCurrentPrice(address pair) public view returns (uint256) {
        IUniswapV3Pool pool = IUniswapV3Pool(pair);
        uint256 dec0 = IERC20Metadata(pool.token0()).decimals();
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();
        return FullMath.mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
    }
}