// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../connectors/uniswap/v3/interfaces/ISwapRouter02.sol";

import "hardhat/console.sol";

/**
 * @dev Contract for swap OP to USDC on UniSwap V3
 */
contract BuyonSwap {

    function buy(
        address _wethToken,
        address _usdcToken,
        address _router
    ) public payable {

        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams(
            _wethToken,
            _usdcToken,
            500, // pool fee 0.05%
            msg.sender,
            msg.value,
            0,
            0
        );
        IERC20(_wethToken).approve(_router, msg.value);
        uint256 amountOut = ISwapRouter02(_router).exactInputSingle(params);
    }
}
