// /**
//  *Submitted for verification at Optimistic.Etherscan.io on 2022-10-06
//  */

// // SPDX-License-Identifier: MIT
// pragma solidity >=0.8.0 <0.9.0;

// import "@openzeppelin/contracts/utils/Context.sol";
// import "@openzeppelin/contracts/utils/Address.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";

// interface IOdosExecutor {
//     function executePath(bytes calldata bytecode, uint256[] memory inputAmount) external payable;
// }

// interface IDaiStylePermit {
//     function permit(
//         address holder,
//         address spender,
//         uint256 nonce,
//         uint256 expiry,
//         bool allowed,
//         uint8 v,
//         bytes32 r,
//         bytes32 s
//     ) external;
// }

// /// @title Routing contract for Odos SOR
// /// @author Semiotic AI
// /// @notice Wrapper with security gaurentees around execution of arbitrary operations on user tokens
// contract OdosRouter is Ownable {
//     using SafeERC20 for IERC20;

//     /// @dev The zero address is uniquely used to represent eth since it is already
//     /// recognized as an invalid ERC20, and due to its gas efficiency
//     address constant _ETH = address(0);

//     /// @dev Contains all information needed to describe an input token being swapped from
//     struct inputToken {
//         address tokenAddress;
//         uint256 amountIn;
//         address receiver;
//         bytes permit;
//     }
//     /// @dev Contains all information needed to describe an output token being swapped to
//     struct outputToken {
//         address tokenAddress;
//         uint256 relativeValue;
//         address receiver;
//     }
//     /// @dev Swap event logging
//     event Swapped(
//         address sender,
//         uint256[] amountsIn,
//         address[] tokensIn,
//         uint256[] amountsOut,
//         outputToken[] outputs,
//         uint256 valueOutQuote
//     );

//     /// @dev Must exist in order for contract to receive eth
//     receive() external payable {}

//     /// @notice Performs a swap for a given value of some combination of specified output tokens
//     /// @param inputs list of input token structs for the path being executed
//     /// @param outputs list of output token structs for the path being executed
//     /// @param valueOutQuote value of destination tokens quoted for the path
//     /// @param valueOutMin minimum amount of value out the user will accept
//     /// @param executor Address of contract that will execute the path
//     /// @param pathDefinition Encoded path definition for executor
//     function swap(
//         inputToken[] memory inputs,
//         outputToken[] memory outputs,
//         uint256 valueOutQuote,
//         uint256 valueOutMin,
//         address executor,
//         bytes calldata pathDefinition
//     ) external payable returns (uint256[] memory amountsOut, uint256 gasLeft) {
//         // Check for valid output specifications
//         require(valueOutMin <= valueOutQuote, "Minimum greater than quote");
//         require(valueOutMin > 0, "Slippage limit too low");

//         // Check input specification validity and transfer input tokens to executor
//         {
//             uint256 expected_msg_value = 0;
//             for (uint256 i = 0; i < inputs.length; i++) {
//                 for (uint256 j = 0; j < i; j++) {
//                     require(
//                         inputs[i].tokenAddress != inputs[j].tokenAddress,
//                         "Duplicate source tokens"
//                     );
//                 }
//                 for (uint256 j = 0; j < outputs.length; j++) {
//                     require(
//                         inputs[i].tokenAddress != outputs[j].tokenAddress,
//                         "Arbitrage not supported"
//                     );
//                 }
//                 if (inputs[i].tokenAddress == _ETH) {
//                     expected_msg_value = inputs[i].amountIn;
//                 } else {
//                     _permit(inputs[i].tokenAddress, inputs[i].permit);
//                     IERC20(inputs[i].tokenAddress).safeTransferFrom(
//                         msg.sender,
//                         inputs[i].receiver,
//                         inputs[i].amountIn
//                     );
//                 }
//             }
//             require(msg.value == expected_msg_value, "Invalid msg.value");
//         }
//         // Check outputs for duplicates and record balances before swap
//         uint256[] memory balancesBefore = new uint256[](outputs.length);
//         for (uint256 i = 0; i < outputs.length; i++) {
//             for (uint256 j = 0; j < i; j++) {
//                 require(
//                     outputs[i].tokenAddress != outputs[j].tokenAddress,
//                     "Duplicate destination tokens"
//                 );
//             }
//             balancesBefore[i] = _universalBalance(outputs[i].tokenAddress);
//         }

//         // Extract arrays of input amount values and tokens from the inputs struct list
//         uint256[] memory amountsIn = new uint256[](inputs.length);
//         address[] memory tokensIn = new address[](inputs.length);
//         {
//             for (uint256 i = 0; i < inputs.length; i++) {
//                 amountsIn[i] = inputs[i].amountIn;
//                 tokensIn[i] = inputs[i].tokenAddress;
//             }
//         }
//         // Delegate the execution of the path to the specified Odos Executor
//         IOdosExecutor(executor).executePath{value: msg.value}(pathDefinition, amountsIn);
//         {
//             uint256 valueOut;
//             amountsOut = new uint256[](outputs.length);
//             for (uint256 i = 0; i < outputs.length; i++) {
//                 if (valueOut == valueOutQuote) break;

//                 // Record the destination token balance before the path is executed
//                 amountsOut[i] = _universalBalance(outputs[i].tokenAddress) - balancesBefore[i];
//                 valueOut += amountsOut[i] * outputs[i].relativeValue;

//                 // If the value out excedes the quoted value out, transfer enough to
//                 // fulfil the quote and break the loop (any other tokens will be over quote)
//                 if (valueOut > valueOutQuote) {
//                     amountsOut[i] -= (valueOut - valueOutQuote) / outputs[i].relativeValue;
//                     valueOut = valueOutQuote;
//                 }
//                 _universalTransfer(outputs[i].tokenAddress, outputs[i].receiver, amountsOut[i]);
//             }
//             require(valueOut > valueOutMin, "Slippage Limit Exceeded");
//         }
//         emit Swapped(msg.sender, amountsIn, tokensIn, amountsOut, outputs, valueOutQuote);
//         gasLeft = gasleft();
//     }

//     /// @notice Allows the owner to transfer funds held by the router contract
//     /// @param tokens List of token address to be transferred
//     /// @param amounts List of amounts of each token to be transferred
//     /// @param dest Address to which the funds should be sent
//     function transferFunds(
//         address[] calldata tokens,
//         uint256[] calldata amounts,
//         address dest
//     ) external onlyOwner {
//         require(tokens.length == amounts.length, "Invalid funds transfer");
//         for (uint256 i = 0; i < tokens.length; i++) {
//             _universalTransfer(tokens[i], dest, amounts[i]);
//         }
//     }

//     /// @notice helper function to get balance of ERC20 or native coin for this contract
//     /// @param token address of the token to check, null for native coin
//     /// @return balance of specified coin or token
//     function _universalBalance(address token) private view returns (uint256) {
//         if (token == _ETH) {
//             return address(this).balance;
//         } else {
//             return IERC20(token).balanceOf(address(this));
//         }
//     }

//     /// @notice helper function to transfer ERC20 or native coin
//     /// @param token address of the token being transferred, null for native coin
//     /// @param to address to transfer to
//     /// @param amount to transfer
//     function _universalTransfer(address token, address to, uint256 amount) private {
//         if (token == _ETH) {
//             (bool success, ) = payable(to).call{value: amount}("");
//             require(success, "ETH transfer failed");
//         } else {
//             IERC20(token).safeTransfer(to, amount);
//         }
//     }

//     /// @notice Executes an ERC20 or Dai Style Permit
//     /// @param token address of token permit is for
//     /// @param permit the byte information for permit execution, 0 for no operation
//     function _permit(address token, bytes memory permit) internal {
//         if (permit.length > 0) {
//             if (permit.length == 32 * 7) {
//                 (bool success, ) = token.call(
//                     abi.encodePacked(IERC20Permit.permit.selector, permit)
//                 );
//                 require(success, "IERC20Permit failed");
//             } else if (permit.length == 32 * 8) {
//                 (bool success, ) = token.call(
//                     abi.encodePacked(IDaiStylePermit.permit.selector, permit)
//                 );
//                 require(success, "Dai Style Permit failed");
//             } else {
//                 revert("Invalid Permit");
//             }
//         }
//     }
// }
