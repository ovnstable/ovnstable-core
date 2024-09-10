//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "../../interfaces/core/IPoolMathFacet.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";

contract PoolMathAerodromeFacet is IPoolMathFacet, Modifiers {
    function toUint160(uint256 y) external onlyDiamond view returns (uint160) {
        return SafeCast.toUint160(y);
    }

    function mulDiv(uint256 a, uint256 b, uint256 denominator) external onlyDiamond view returns (uint256) {
        return FullMath.mulDiv(a, b, denominator);
    }

    function getTickAtSqrtRatio(uint160 sqrtPriceX96) external onlyDiamond view returns (int24) {
        return TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    }

    function getSqrtRatioAtTick(int24 tick) external onlyDiamond view returns (uint160) {
        return TickMath.getSqrtRatioAtTick(tick);
    }

    function getPoolDecimals(address pair) external onlyDiamond view returns (uint256, uint256) {
        ICLPool pool = ICLPool(pair);
        return (IERC20Metadata(pool.token0()).decimals(), IERC20Metadata(pool.token1()).decimals());
    }

    function getPoolSqrtRatioX96(address pair) external onlyDiamond view returns (uint160 sqrtRatioX96) {
        (sqrtRatioX96,,,,,) = ICLPool(pair).slot0();
    }

    function getPoolTickSpacing(address pair) external onlyDiamond view returns (int24) {
        return ICLPool(pair).tickSpacing();
    }

    function getPoolTick(address pair) external onlyDiamond view returns (int24 tick) {
        (, tick,,,,) = ICLPool(pair).slot0();
    }

    function getPoolTokens(address pair) external onlyDiamond view returns (address, address) {
        ICLPool pool = ICLPool(pair);
        return (pool.token0(), pool.token1());
    }

    // function getLiquidity(address pair) external onlyDiamond view returns (uint128) {
    //     return ICLPool(pair).liquidity();
    // }

    function getLiquidityForAmounts(
        uint160 sqrtRatioX96,
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint256 amount0,
        uint256 amount1
    ) external onlyDiamond view returns (uint128) {
        return LiquidityAmounts.getLiquidityForAmounts(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, amount0, amount1);
    }

    function getAmountsForLiquidity(
        uint160 sqrtRatioX96,
        uint160 sqrtRatioAX96,
        uint160 sqrtRatioBX96,
        uint128 liquidity
    ) external onlyDiamond view returns (uint256, uint256) {
        return LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);
    }

    // function estimateAmount0(
    //     uint256 amount1,
    //     uint128 liquidity,
    //     uint160 sqrtRatioX96,
    //     int24 tickLow,
    //     int24 tickHigh
    // ) external pure returns (uint256) { 
    //     return SqrtPriceMath.estimateAmount0(amount1, liquidity, sqrtRatioX96, tickLow, tickHigh);
    // }

    // function estimateAmount1(
    //     uint256 amount0,
    //     uint128 liquidity,
    //     uint160 sqrtRatioX96,
    //     int24 tickLow,
    //     int24 tickHigh
    // ) external pure returns (uint256) {
    //     return SqrtPriceMath.estimateAmount1(amount0, liquidity, sqrtRatioX96, tickLow, tickHigh);
    // }

    //  function getNextSqrtPriceFromAmounts(
    //     uint160 sqrtPriceX96,
    //     uint128 liquidity,
    //     uint256 amount0,
    //     uint256 amount1,
    //     bool direction
    // ) external pure returns (uint160 nextSqrtPriceX96) {
    //     require(sqrtPriceX96 > 0 && liquidity > 0, "Invalid sqrtPriceX96 or liquidity");

    //     uint160 sqrtP1 = direction ? SqrtPriceMath.getNextSqrtPriceFromAmount1RoundingDown(
    //         sqrtPriceX96,
    //         liquidity,
    //         amount1,
    //         true
    //     ) : SqrtPriceMath.getNextSqrtPriceFromAmount0RoundingUp(
    //         sqrtPriceX96,
    //         liquidity,
    //         amount0,
    //         true 
    //     );

    //     uint128 liquidityDelta = direction ? LiquidityAmounts.getLiquidityForAmount1(
    //         sqrtPriceX96,
    //         sqrtP1,
    //         amount1
    //     ) : LiquidityAmounts.getLiquidityForAmount0(
    //         sqrtPriceX96,
    //         sqrtP1,
    //         amount0
    //     );

    //     nextSqrtPriceX96 = direction ? SqrtPriceMath.getNextSqrtPriceFromAmount1RoundingDown(
    //         sqrtP1,
    //         liquidity + liquidityDelta,
    //         amount1,
    //         false
    //     ) : SqrtPriceMath.getNextSqrtPriceFromAmount0RoundingUp(
    //         sqrtP1,
    //         liquidity + liquidityDelta,
    //         amount0,
    //         false
    //     );
    // }
}
