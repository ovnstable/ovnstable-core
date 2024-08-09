//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IPoolFetcherFacet {
    struct TokenInfo {
        address tokenId;
        uint8 decimals;
        string name;
        string symbol;
    }

    struct PoolInfo {
        address poolId;
        TokenInfo token0;
        TokenInfo token1;
        uint256 amount0;
        uint256 amount1;
        int24 tickSpacing;
        address gauge;
    }

    function getPools(
        uint256 limit,
        uint256 offset
    ) external view returns (PoolInfo[] memory);

    function getPoolsAmount() external view returns (uint256);
}
