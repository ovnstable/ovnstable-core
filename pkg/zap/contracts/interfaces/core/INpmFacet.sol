//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/**
 * @title INpmFacet
 * @dev Interface for the Non-fungible Position Manager (NPM) Facet
 * This interface defines the structure and functions for managing liquidity positions
 * in a decentralized exchange environment.
 */
interface INpmFacet {
    /**
     * @dev Emitted when rewards are collected from a position
     * @param amount0 The amount of token0 collected
     * @param amount1 The amount of token1 collected
     */
    event CollectRewards(uint256 amount0, uint256 amount1);

    /**
     * @dev Struct to hold information about a liquidity position
     */
    struct PositionInfo {
        string platform;     // The protocol where the position is held
        uint256 tokenId;     // Unique identifier for the position
        address poolId;      // Address of the liquidity pool
        address token0;      // Address of the first token in the pair
        address token1;      // Address of the second token in the pair
        uint256 amount0;     // Amount of token0 in the position
        uint256 amount1;     // Amount of token1 in the position
        uint256 fee0;        // Accumulated fees for token0
        uint256 fee1;        // Accumulated fees for token1
        uint256 emissions;   // Emissions rewards
        int24 tickLower;     // Lower tick of the position's price range
        int24 tickUpper;     // Upper tick of the position's price range
        int24 currentTick;   // Current tick of the pool
        bool isStaked;       // Whether the position is staked
    }

    /**
     * @dev Creates a new liquidity position
     * @param pair Address of the liquidity pool
     * @param tickRange0 Lower tick of the position's price range
     * @param tickRange1 Upper tick of the position's price range
     * @param amountOut0 Amount of token0 to add to the position
     * @param amountOut1 Amount of token1 to add to the position
     * @param recipient Address to receive the minted position nft
     * @return The ID of the newly minted position
     */
    function mintPosition(
        address pair,
        int24 tickRange0,
        int24 tickRange1,
        uint256 amountOut0,
        uint256 amountOut1,
        address recipient
    ) external returns (uint256);

    /**
     * @dev Increases the liquidity of an existing position
     * @param tokenId The ID of the position to increase liquidity for
     * @param amount0 Additional amount of token0 to add
     * @param amount1 Additional amount of token1 to add
     * @return The new liquidity amount
     */
    function increaseLiquidity(
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1
    ) external returns (uint128);

    /**
     * @dev Closes an existing position
     * @param tokenId The ID of the position to close
     * @param recipient Address to receive the withdrawn tokens
     * @param feeRecipient Address to receive the accumulated fees
     */
    function closePosition(uint256 tokenId, address recipient, address feeRecipient) external;

    /**
     * @dev Retrieves all positions for a given wallet address
     * @param wallet The address to get positions for
     * @return An array of PositionInfo structs
     */
    function getPositions(address wallet) external view returns (PositionInfo[] memory);

    /**
     * @dev Gets the token amounts for a specific position
     * @param tokenId The ID of the position
     * @return The amounts of token0 and token1 in the position
     */
    function getPositionAmounts(uint256 tokenId) external view returns (uint256, uint256);

    /**
     * @dev Checks if the sender is the owner of a position
     * @param tokenId The ID of the position to check
     * @param sender The address to check ownership for
     */
    function checkForOwner(uint256 tokenId, address sender) external view;

    /**
     * @dev Gets the addresses of the tokens in a position
     * @param tokenId The ID of the position
     * @return The addresses of token0 and token1
     */
    function getTokens(uint256 tokenId) external view returns (address, address);

    /**
     * @dev Gets the tick range of a position
     * @param tokenId The ID of the position
     * @return The lower and upper ticks of the position
     */
    function getPositionTicks(uint256 tokenId) external view returns (int24, int24);

    /**
     * @dev Gets the pool address for a position
     * @param tokenId The ID of the position
     * @return The address of the pool
     */
    function getPool(uint256 tokenId) external view returns (address);

    // /**
    //  * @dev Checks if the given position is valid.
    //  * @param tokenId The ID of the position.
    //  * @return A boolean value indicating whether the position is valid.
    //  */
    // function isValidPosition(uint256 tokenId) external view returns (bool);
}
