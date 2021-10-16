// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../connectors/swaps/interfaces/IUniswapV2Router02.sol";

contract WMatic2UsdcTokenExchange is ITokenExchange {
    IUniswapV2Router02 swapRouter;
    IERC20 usdcToken;
    IERC20 wMaticToken;

    constructor(
        address _swapRouter,
        address _usdcToken,
        address _wMaticToken
    ) {
        require(_swapRouter != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_wMaticToken != address(0), "Zero address not allowed");

        swapRouter = IUniswapV2Router02(_swapRouter);
        usdcToken = IERC20(_usdcToken);
        wMaticToken = IERC20(_wMaticToken);
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == usdcToken && to == wMaticToken) || (from == wMaticToken && to == usdcToken),
            "WMatic2UsdcTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            return;
        }

        if (from == usdcToken && to == wMaticToken) {
            revert("WMatic2UsdcTokenExchange: Allowed only exchange wMatic to USDC");
        } else {
            //TODO: denominator usage
            uint256 denominator = 10**(18 - IERC20Metadata(address(wMaticToken)).decimals());
            amount = amount / denominator;

            require(
                wMaticToken.balanceOf(address(this)) >= amount,
                "WMatic2UsdcTokenExchange: Not enough wMaticToken"
            );
            wMaticToken.approve(address(swapRouter), amount);

            address[] memory path = new address[](2);
            path[0] = address(wMaticToken);
            path[1] = address(usdcToken);
            // TODO: use some calculation or Oracle call instead of usage '0' as amountOutMin
            swapRouter.swapExactTokensForTokens(
                amount, //    uint amountIn,
                0, //          uint amountOutMin,
                path,
                receiver,
                block.timestamp + 600 // 10 mins
            );
        }
    }
}
