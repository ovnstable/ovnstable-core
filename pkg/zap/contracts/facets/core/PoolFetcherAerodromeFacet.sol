//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/core/IPoolFetcherFacet.sol";
import "../../interfaces/Constants.sol";

contract PoolFetcherAerodromeFacet is IPoolFetcherFacet {
    function getPools(
        uint256 limit,
        uint256 offset
    ) external view returns (PoolInfo[] memory result) {
        ICLFactory factory = ICLFactory(INonfungiblePositionManager(LibCoreStorage.coreStorage().npm).factory());

        uint256 poolsLength = factory.allPoolsLength();
        uint256 size;
        if (offset < poolsLength) {
            size = offset + limit > poolsLength ? poolsLength - offset : limit;
        }
        result = new PoolInfo[](size);
        for (uint256 i = offset; i < offset + size; i++) {
            uint256 j = i - offset;
            ICLPool pool = ICLPool(factory.allPools(i));
            result[j].poolId = address(pool);
            result[j].token0 = getTokenInfo(pool.token0());
            result[j].token1 = getTokenInfo(pool.token1());
            result[j].tickSpacing = pool.tickSpacing();
            result[j].gauge = pool.gauge();
            (result[j].amount0, result[j].amount1) = getPoolAmounts(pool);
        }
    }

    function getPoolsAmount() external view returns (uint256) {
        ICLFactory factory = ICLFactory(INonfungiblePositionManager(LibCoreStorage.coreStorage().npm).factory());
        return factory.allPoolsLength();
    }

    function getTokenInfo(address tokenId) internal view returns (TokenInfo memory) {
        IERC20Metadata token = IERC20Metadata(tokenId);
        return TokenInfo({
            tokenId: tokenId,
            decimals: token.decimals(),
            name: token.name(),
            symbol: token.symbol()
        });
    }

    function getPoolAmounts(ICLPool pool) internal view returns (uint256, uint256) {
        (uint160 sqrtRatioX96,,,,,) = pool.slot0();
        uint128 liquidity = pool.liquidity();
        return LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, TickMath.MIN_SQRT_RATIO, TickMath.MAX_SQRT_RATIO, liquidity);
    }
}
