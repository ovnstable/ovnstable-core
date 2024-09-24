//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title IAggregatorFacet
/// @notice Interface for the Aggregator Facet, which provides functions to fetch and manage pool information
interface IAggregatorFacet {

    /// @notice Struct to store token information
    /// @param tokenId The address of the token
    /// @param decimals The number of decimals for the token
    /// @param name The name of the token
    /// @param symbol The ticker of the token
    struct TokenInfo {
        address tokenId;
        uint8 decimals;
        string name;
        string symbol;
    }

    /// @notice Struct to store pool information
    /// @param platform The name of the platform
    /// @param poolId The address of the pool
    /// @param token0 TokenInfo for the first token in the pair
    /// @param token1 TokenInfo for the second token in the pair
    /// @param tickSpacing The tick spacing for the pool
    /// @param fee The fee for the pool
    /// @param amount0 The amount of token0 in the pool
    /// @param amount1 The amount of token1 in the pool
    /// @param price The price of the pool
    /// @param gauge The address of the gauge associated with the pool
    struct PoolInfo {
        string platform;
        address poolId;
        TokenInfo token0;
        TokenInfo token1;
        int24 tickSpacing;
        uint24 fee;
        uint256 amount0;
        uint256 amount1;
        uint256 price;
        address gauge;
    }

    /// @notice Returns the name of the protocol
    /// @return The name of the protocol as a string
    function protocolName() external pure returns (string memory);

    /// @notice Fetches a list of pools
    /// @param limit The maximum number of pools to fetch
    /// @param offset The starting index for fetching pools
    /// @return An array of PoolInfo structs containing the fetched pool information
    function fetchPools(
        uint256 limit,
        uint256 offset
    ) external view returns (PoolInfo[] memory);

    /// @notice Returns the total number of pools
    /// @return The total number of pools as a uint256
    function getPoolsAmount() external view returns (uint256);
}
