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
        uint256[] priceRange; // TODO: fix all sqrt implementations
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

        _addLiquidity(pair, tokensOut, amountsOut, aerodromeData.priceRange);
    }

    function getProportion(
        address _pair, uint256[] memory priceRange
    ) public view returns (uint256 token0Amount, uint256 token1Amount, uint256 denominator) {
        IUniswapV3Pool pair = IUniswapV3Pool(_pair);
        IERC20Metadata token0 = IERC20Metadata(pair.token0());
        IERC20Metadata token1 = IERC20Metadata(pair.token1());

        uint256 dec0 = token0.decimals();
        uint256 dec1 = token1.decimals();

        console.log("dec:", dec0);

        (uint160 sqrtRatioX96,,,,,) = pair.slot0();
        // int24 tickSpacing = pair.tickSpacing();

        // console.log("sqrtRatioX96:", sqrtRatioX96);

        // uint160 sqrtRatio0 = 
        // uint160 sqrtRatio1 = ;

        // console.log("sqrt0: ", sqrtRatio0);
        // console.log("sqrt1: ", sqrtRatio1);

        

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtRatioX96,
            getSqrtRatioByPrice(priceRange[0], 10 ** dec0),
            getSqrtRatioByPrice(priceRange[1], 10 ** dec0),
            dec0 * 1000000,
            dec1 * 1000000
        );

        console.log("liq:", liquidity);

        denominator = 10 ** (dec0 > dec1 ? dec0 : dec1);
        token0Amount = uint256(SqrtPriceMath.getAmount0Delta(getSqrtRatioByPrice(priceRange[1], 10 ** dec0),  sqrtRatioX96, int128(liquidity))) * (denominator / (10 ** dec0));
        token1Amount = uint256(SqrtPriceMath.getAmount1Delta(sqrtRatioX96, getSqrtRatioByPrice(priceRange[1], 10 ** dec0), int128(liquidity))) * (denominator / (10 ** dec1));

        console.log("amo0:", token0Amount);
        console.log("amo1:", token1Amount);
    }

    function _addLiquidity(IUniswapV3Pool pair, address[] memory tokensOut, uint256[] memory amountsOut, uint256[] memory priceRange) internal {
        
        (uint256 reserve0, uint256 reserve1,) = getProportion(address(pair), priceRange);

        (uint256 tokensAmount0, uint256 tokensAmount1) = _getAmountToSwap(
            amountsOut[0],
            amountsOut[1],
            reserve0,
            reserve1,
            10 ** IERC20Metadata(tokensOut[0]).decimals(),
            10 ** IERC20Metadata(tokensOut[1]).decimals()
        );
        
        ResultOfLiquidity memory result;

        {
        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
        asset0.approve(address(npm), tokensAmount0);
        asset1.approve(address(npm), tokensAmount1);

        
        result.amountAsset0Before = asset0.balanceOf(address(this));
        result.amountAsset1Before = asset1.balanceOf(address(this));
        }

        {
            (uint160 sqrtRatioX96,,,,,) = pair.slot0();


            uint160 sqrtRatio0 = getSqrtRatioByPrice(priceRange[0], 10 ** IERC20Metadata(tokensOut[0]).decimals());
            uint160 sqrtRatio1 = getSqrtRatioByPrice(priceRange[1], 10 ** IERC20Metadata(tokensOut[0]).decimals());

            
                

            console.log("token0: ", tokensOut[0]);
            console.log("token1: ", tokensOut[1]);
            // console.log("tickSpace: ", pair.tickSpacing());

            console.log("amount0Desired: ", tokensAmount0);
            console.log("amount1Desired: ", tokensAmount1);
            // console.log("amount0Min: ", params.amount0Min);
            // console.log("amount1Min: ", params.amount1Min);
            console.log("recipient: ", msg.sender);
            console.log("deadline: ", block.timestamp);
            // console.log("sqrtPriceX96: ", sqrtPriceX96);

        
            npm.mint(INonfungiblePositionManager.MintParams(tokensOut[0], tokensOut[1], pair.tickSpacing(),
                TickMath.getTickAtSqrtRatio(sqrtRatio0), TickMath.getTickAtSqrtRatio(sqrtRatio1), tokensAmount0, tokensAmount1, 0, 0, msg.sender, block.timestamp, 0));
        }

        IERC20 asset0 = IERC20(tokensOut[0]);
        IERC20 asset1 = IERC20(tokensOut[1]);
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

    function getSqrtRatioByPrice(uint256 price, uint256 decimals) public pure returns (uint160) {
        return SafeCast.toUint160(sqrt(FullMath.mulDiv(price, 2 ** 192, decimals)));
    }

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }


    function getPriceBySqrtRatio(uint160 sqrtRatio) public pure returns (uint256) {
        uint256 price = FullMath.mulDiv(uint256(sqrtRatio) * 10**10, uint256(sqrtRatio) * 10**8, 2 ** (96+96));
        return price;
    }

    function getCurrentPrice(address pair) public view returns (uint256) {
        IUniswapV3Pool pair = IUniswapV3Pool(pair);
        (uint160 sqrtRatioX96,,,,,) = pair.slot0();
        return FullMath.mulDiv(uint256(sqrtRatioX96) * 10**10, uint256(sqrtRatioX96) * 10**8, 2 ** (96+96));
    }
}
