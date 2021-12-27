// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IConnector.sol";

contract Usdc2VimUsdTokenExchange is ITokenExchange {
    IConnector public idleConnector;
    IERC20 public usdcToken;
    IERC20 public vimUsdToken;

    uint256 usdcDenominator;
    uint256 vimUsdDenominator;

    constructor(
        address _idleConnector,
        address _usdcToken,
        address _vimUsdToken
    ) {
        require(_idleConnector != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_vimUsdToken != address(0), "Zero address not allowed");

        idleConnector = IConnector(_idleConnector);
        usdcToken = IERC20(_usdcToken);
        vimUsdToken = IERC20(_vimUsdToken);

        usdcDenominator = 10 ** (18 - IERC20Metadata(address(usdcToken)).decimals());
        vimUsdDenominator = 10 ** (18 - IERC20Metadata(address(vimUsdToken)).decimals());
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == usdcToken && to == vimUsdToken) || (from == vimUsdToken && to == usdcToken),
            "Usdc2VimUsdTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            uint256 fromBalance = from.balanceOf(address(this));
            if (fromBalance > 0) {
                from.transfer(spender, fromBalance);
            }
            return;
        }

        if (from == usdcToken && to == vimUsdToken) {
            //TODO: denominator usage
            amount = amount / usdcDenominator;

            // if amount eq 0 after normalization transfer back balance and skip staking
            uint256 balance = usdcToken.balanceOf(address(this));
            if (amount == 0) {
                if (balance > 0) {
                    usdcToken.transfer(spender, balance);
                }
                return;
            }

            require(
                balance >= amount,
                "Usdc2VimUsdTokenExchange: Not enough usdcToken"
            );

            usdcToken.transfer(address(idleConnector), amount);
            idleConnector.stake(address(usdcToken), amount, receiver);

            // transfer back unused amount
            uint256 unusedBalance = usdcToken.balanceOf(address(this));
            if (unusedBalance > 0) {
                usdcToken.transfer(spender, unusedBalance);
            }
        } else {
            //TODO: denominator usage
            amount = amount / vimUsdDenominator;

            // if amount eq 0 after normalization transfer back balance and skip staking
            uint256 balance = vimUsdToken.balanceOf(address(this));
            if (amount == 0) {
                if (balance > 0) {
                    vimUsdToken.transfer(spender, balance);
                }
                return;
            }

            // aToken on transfer can lost/add 1 wei. On lost we need correct amount
            if (balance + 1 == amount) {
                amount = amount - 1;
            }

            require(
                balance >= amount,
                "Usdc2VimUsdTokenExchange: Not enough vimUsdToken"
            );

            // move assets to connector
            vimUsdToken.transfer(address(idleConnector), amount);

            // correct exchangeAmount if we got diff on aToken transfer
            uint256 onIdleConnectorBalance = vimUsdToken.balanceOf(address(idleConnector));
            if (onIdleConnectorBalance < amount) {
                amount = onIdleConnectorBalance;
            }
            uint256 withdrewAmount = idleConnector.unstake(address(usdcToken), amount, receiver);

            //TODO: may be add some checks for withdrewAmount

            // transfer back unused amount
            uint256 unusedBalance = vimUsdToken.balanceOf(address(this));
            if (unusedBalance > 0) {
                vimUsdToken.transfer(spender, unusedBalance);
            }
        }
    }
}
