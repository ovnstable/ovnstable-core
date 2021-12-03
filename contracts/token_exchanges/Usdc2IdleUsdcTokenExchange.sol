// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IConnector.sol";

contract Usdc2IdleUsdcTokenExchange is ITokenExchange {
    IConnector public idleConnector;
    IERC20 public usdcToken;
    IERC20 public idleUsdcToken;

    constructor(
        address _idleConnector,
        address _usdcToken,
        address _idleUsdcToken
    ) {
        require(_idleConnector != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_idleUsdcToken != address(0), "Zero address not allowed");

        idleConnector = IConnector(_idleConnector);
        usdcToken = IERC20(_usdcToken);
        idleUsdcToken = IERC20(_idleUsdcToken);
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == usdcToken && to == idleUsdcToken) || (from == idleUsdcToken && to == usdcToken),
            "Usdc2IdleUsdcTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            from.transfer(spender, from.balanceOf(address(this)));
            return;
        }

        if (from == usdcToken && to == idleUsdcToken) {
            //TODO: denominator usage
            uint256 denominator = 10**(18 - IERC20Metadata(address(usdcToken)).decimals());
            amount = amount / denominator;

            require(
                usdcToken.balanceOf(address(this)) >= amount,
                "Usdc2IdleUsdcTokenExchange: Not enough usdcToken"
            );

            // check after denormalization
            if (amount == 0) {
                from.transfer(spender, from.balanceOf(address(this)));
                return;
            }

            usdcToken.transfer(address(idleConnector), amount);
            idleConnector.stake(address(usdcToken), amount, receiver);
        } else {
            //TODO: denominator usage
            uint256 denominator = 10**(18 - IERC20Metadata(address(idleUsdcToken)).decimals());
            amount = amount / denominator;

            require(
                idleUsdcToken.balanceOf(address(this)) >= amount,
                "Usdc2IdleUsdcTokenExchange: Not enough idleUsdcToken"
            );

            // check after denormalization
            if (amount == 0) {
                from.transfer(spender, from.balanceOf(address(this)));
                return;
            }

            idleUsdcToken.transfer(address(idleConnector), amount);
            uint256 withdrawAmount = idleConnector.unstake(address(usdcToken), amount, receiver);

            //TODO: may be add some checks for withdrawAmount
        }
    }
}
