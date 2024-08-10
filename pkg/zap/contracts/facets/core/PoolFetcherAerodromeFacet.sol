//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "../../libraries/core/LibCoreStorage.sol";
import "../../interfaces/core/IPoolFetcherFacet.sol";
import "../../interfaces/Constants.sol";

contract PoolFetcherAerodromeFacet is IPoolFetcherFacet {
    function fetchPools(
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

    function fetchTokens() external view returns (TokenInfo[] memory result) {
        uint256 n = _getTokensAmount();
        uint256 amount;
        result = new TokenInfo[](n);
        address[] memory tokenIds = new address[](n);
        ICLFactory factory = ICLFactory(INonfungiblePositionManager(LibCoreStorage.coreStorage().npm).factory());
        uint256 poolsLength = factory.allPoolsLength();

        for (uint256 i = 0; i < poolsLength; i++) {
            ICLPool pool = ICLPool(factory.allPools(i));

            if (!containsToken(tokenIds, pool.token0(), amount)) {
                tokenIds[amount] = pool.token0();
                result[amount] = getTokenInfo(pool.token0());
                amount++;
            }
            if (!containsToken(tokenIds, pool.token1(), amount)) {
                tokenIds[amount] = pool.token1();
                result[amount] = getTokenInfo(pool.token1());
                amount++;
            }
        }
    }

    function getTokensAmount() external view returns (uint256) {
        return _getTokensAmount();
    }

    function getPoolsAmount() external view returns (uint256) {
        ICLFactory factory = ICLFactory(INonfungiblePositionManager(LibCoreStorage.coreStorage().npm).factory());
        return factory.allPoolsLength();
    }

    function _getTokensAmount() internal view returns (uint256 amount) {
        ICLFactory factory = ICLFactory(INonfungiblePositionManager(LibCoreStorage.coreStorage().npm).factory());
        amount = 0;
        uint256 poolsLength = factory.allPoolsLength();
        address[] memory tokenIds = new address[](poolsLength * 2);

        for (uint256 i = 0; i < poolsLength; i++) {
            ICLPool pool = ICLPool(factory.allPools(i));
            if (!containsToken(tokenIds, pool.token0(), amount)) {
                tokenIds[amount] = pool.token0();
                amount++;
            }
            if (!containsToken(tokenIds, pool.token1(), amount)) {
                tokenIds[amount] = pool.token1();
                amount++;
            }
        }
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

    function containsToken(address[] memory tokenIds, address token, uint256 n) internal pure returns (bool) {
        for (uint256 i = 0; i < n; i++) {
            if (tokenIds[i] == token) {
                return true;
            }
        }
        return false;
    }
}
