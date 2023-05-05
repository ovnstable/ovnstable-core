// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/// @title Routing contract for Odos SOR
/// @author Semiotic AI
/// @notice Wrapper with security gaurentees around execution of arbitrary operations on user tokens
interface IOdosRouter {
    /// @dev Contains all information needed to describe an input token being swapped from
    struct inputToken {
        address tokenAddress;
        uint256 amountIn;
        address receiver;
        bytes permit;
    }
    /// @dev Contains all information needed to describe an output token being swapped to
    struct outputToken {
        address tokenAddress;
        uint256 relativeValue;
        address receiver;
    }
    /// @dev Swap event logging
    event Swapped(
        address sender,
        uint256[] amountsIn,
        address[] tokensIn,
        uint256[] amountsOut,
        outputToken[] outputs,
        uint256 valueOutQuote
    );

    /// @notice Performs a swap for a given value of some combination of specified output tokens
    /// @param inputs list of input token structs for the path being executed
    /// @param outputs list of output token structs for the path being executed
    /// @param valueOutQuote value of destination tokens quoted for the path
    /// @param valueOutMin minimum amount of value out the user will accept
    /// @param executor Address of contract that will execute the path
    /// @param pathDefinition Encoded path definition for executor
    function swap(
        inputToken[] memory inputs,
        outputToken[] memory outputs,
        uint256 valueOutQuote,
        uint256 valueOutMin,
        address executor,
        bytes calldata pathDefinition
    ) external payable returns (uint256[] memory amountsOut, uint256 gasLeft);
}
