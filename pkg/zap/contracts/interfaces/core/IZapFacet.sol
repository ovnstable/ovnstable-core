//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

/// @title IZapFacet
/// @notice Interface for the ZapFacet contract, which handles various liquidity management operations
/// @dev This interface defines the structures and functions for zapping in/out, rebalancing, increasing, and merging liquidity positions
interface IZapFacet {

    /// @notice Emitted after odos swap
    /// @param tokens Array of input token addresses
    /// @param amounts Array of input token amounts
    event InputTokens(address[] tokens, uint256[] amounts);

    /// @notice Emitted after odos swap
    /// @param tokens Array of output token addresses
    /// @param amounts Array of output token amounts
    event OutputTokens(address[] tokens, uint256[] amounts);

    /// @notice Emitted with the result of a zap operation
    /// @param tokens Array of pool token addresses
    /// @param initialAmounts Amounts of tokens after odos swap
    /// @param putAmounts Amounts of tokens put into the pool
    /// @param returnedAmounts Amounts of tokens returned to the user
    event ZapResult(
        address[] tokens, 
        uint256[] initialAmounts, 
        uint256[] putAmounts, 
        uint256[] returnedAmounts
    );

    /// @notice Emitted when a new token ID is generated
    /// @param tokenId The ID of the token
    event TokenId(uint256 tokenId);

    /// @notice Error thrown when the received amount after odos swap is below the minimum expected
    /// @param tokenAddress Address of the token
    /// @param amountMin Minimum expected amount
    /// @param amountReceived Actual amount received
    error BelowAmountMin(address tokenAddress, uint256 amountMin, uint256 amountReceived);

    /// @notice Error thrown with the simulation result of a zap operation
    /// @param tokens Array of pool token addresses
    /// @param initialAmounts Amounts of tokens after odos swap
    /// @param putAmounts Amounts of tokens put into the pool
    /// @param returnedAmounts Amounts of tokens returned to the user
    /// @param amountToSwap Amount of tokens needed to be swapped secondarily
    /// @param swapSide Flag indicating if swap token0 to token1 or vice versa
    error SimulationResult(
        address[] tokens, 
        uint256[] initialAmounts, 
        uint256[] putAmounts, 
        uint256[] returnedAmounts,
        uint256 amountToSwap,
        bool swapSide
    );

    /// @notice Structure for input token information
    /// @param tokenAddress The address of the input token
    /// @param amountIn The amount of tokens to input
    struct InputToken {
        address tokenAddress;
        uint256 amountIn;
    }

    /// @notice Structure for pool's tokens information
    /// @param tokenAddress The address of the token
    /// @param amountMin The minimum amount of tokens after the swap
    struct OutputToken {
        address tokenAddress;
        uint256 amountMin;
    }

    /// @notice Structure containing swap data
    /// @param inputs An array of input tokens
    /// @param outputs An array of output tokens
    /// @param data Odos router data
    struct SwapData {
        InputToken[] inputs;
        OutputToken[] outputs;
        bytes data;
    }

    /// @notice Parameters for zapping in
    /// @param pool The address of the liquidity pool
    /// @param tickRange An array of tick ranges for the position
    /// @param amountsOut An array of token amounts come directly from the user
    /// @param isSimulation A flag indicating whether this is a zap simulation
    /// @param adjustSwapSide Flag indicating if swap token0 to token1 or vice versa
    /// @param adjustSwapAmount The amount of secondary swap
    struct ZapInParams {
        address pool;
        int24[] tickRange;
        uint256[] amountsOut;

        bool isSimulation;
        bool adjustSwapSide;
        uint256 adjustSwapAmount;
    }

    /// @notice Zaps in to a liquidity position
    /// @param swapData The swap data for the zap
    /// @param paramsData The parameters for the zap
    function zapIn(SwapData memory swapData, ZapInParams memory paramsData) external;

    /// @notice Zaps out of a liquidity position
    /// @param tokenId The ID of the token to zap out of
    function zapOut(uint256 tokenId) external;

    /// @notice Rebalances a liquidity position
    /// @param swapData The swap data for the rebalance
    /// @param paramsData The parameters for the rebalance
    /// @param tokenId The ID of the token to rebalance
    function rebalance(SwapData memory swapData, ZapInParams memory paramsData, uint256 tokenId) external;

    /// @notice Increases a liquidity position
    /// @param swapData The swap data for the increase
    /// @param paramsData The parameters for the increase
    /// @param tokenId The ID of the token to increase
    function increase(SwapData memory swapData, ZapInParams memory paramsData, uint256 tokenId) external;

    /// @notice Merges multiple liquidity positions
    /// @param swapData The swap data for the merge
    /// @param paramsData The parameters for the merge
    /// @param tokenIn The ID of the token to merge into
    /// @param tokensOut An array of token IDs to merge from
    function merge(
        SwapData memory swapData, 
        ZapInParams memory paramsData, 
        uint256 tokenIn, 
        uint256[] memory tokensOut
    ) external;
}
