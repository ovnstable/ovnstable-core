//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV3.sol";
import "../../interfaces/core/IDexFacet.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/Modifiers.sol";

contract PancakeFacet is IDexFacet, Modifiers {
    function toUint160(uint256 y) external onlyDiamond view returns (uint160 z) {
        return SafeCast.toUint160(y);
    }

    function mulDiv(uint256 a, uint256 b, uint256 denominator) external onlyDiamond view returns (uint256 result) {
        return FullMath.mulDiv(a, b, denominator);
    }

    function getTickAtSqrtRatio(uint160 sqrtPriceX96) external onlyDiamond view returns (int24 tick) {
        return TickMath.getTickAtSqrtRatio(sqrtPriceX96);
    }

    function getSqrtRatioAtTick(int24 tick) external onlyDiamond view returns (uint160) {
        return TickMath.getSqrtRatioAtTick(tick);
    }

    function getPoolDecimals(address pair) external onlyDiamond view returns (uint256, uint256) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        return (IERC20Metadata(pool.token0()).decimals(), IERC20Metadata(pool.token1()).decimals());
    }

    function getPoolSqrtRatioX96(address pair) external onlyDiamond view returns (uint160 sqrtRatioX96) {
        (sqrtRatioX96,,,,,,) = IPancakeV3Pool(pair).slot0();
    }

    function getPoolTickSpacing(address pair) external onlyDiamond view returns (int24) {
        return IPancakeV3Pool(pair).tickSpacing();
    }

    function getPoolTick(address pair) external onlyDiamond view returns (int24 tick) {
        (, tick,,,,,) = IPancakeV3Pool(pair).slot0();
    }

    function getPoolTokens(address pair) external onlyDiamond view returns (address, address) {
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        return (pool.token0(), pool.token1());
    }

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

    function mintPosition(
        address pair,
        int24 tickRange0,
        int24 tickRange1,
        uint256 amountOut0,
        uint256 amountOut1
    ) external onlyDiamond returns (uint256 tokenId) {
        INonfungiblePositionManager manager = INonfungiblePositionManager(LibCoreStorage.coreStorage().npm);
        IPancakeV3Pool pool = IPancakeV3Pool(pair);
        address token0 = pool.token0();
        address token1 = pool.token1();
        (tokenId,,,) = manager.mint(MintParams(token0, token1, pool.fee(), tickRange0, tickRange1,
            amountOut0, amountOut1, 0, 0, msg.sender, block.timestamp));
    }
}
