// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IConnector.sol";

contract Usdc2BpspTUsdTokenExchange is ITokenExchange {

    IConnector public connectorBalancer;
    IERC20 public usdcToken;
    IERC20 public bpspTUsdToken;

    uint256 usdcDenominator;
    uint256 bpspTUsdDenominator;

    constructor(
        address _connectorBalancer,
        address _usdcToken,
        address _bpspTUsdToken
    ) {
        require(_connectorBalancer != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_bpspTUsdToken != address(0), "Zero address not allowed");

        connectorBalancer = IConnector(_connectorBalancer);
        usdcToken = IERC20(_usdcToken);
        bpspTUsdToken = IERC20(_bpspTUsdToken);

        usdcDenominator = 10 ** (18 - IERC20Metadata(address(usdcToken)).decimals());
        bpspTUsdDenominator = 10 ** (18 - IERC20Metadata(address(bpspTUsdToken)).decimals());
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == usdcToken && to == bpspTUsdToken) || (from == bpspTUsdToken && to == usdcToken),
            "Usdc2BpspTUsdTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            uint256 fromBalance = from.balanceOf(address(this));
            if (fromBalance > 0) {
                from.transfer(spender, fromBalance);
            }
            return;
        }

        if (from == usdcToken && to == bpspTUsdToken) {
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
                "Usdc2BpspTUsdTokenExchange: Not enough usdcToken"
            );

            usdcToken.transfer(address(connectorBalancer), amount);
            connectorBalancer.stake(address(usdcToken), amount, receiver);

            // transfer back unused amount
            uint256 unusedBalance = usdcToken.balanceOf(address(this));
            if (unusedBalance > 0) {
                usdcToken.transfer(spender, unusedBalance);
            }
        } else {
            //TODO: denominator usage
            amount = amount / bpspTUsdDenominator;

            // if amount eq 0 after normalization transfer back balance and skip staking
            uint256 balance = bpspTUsdToken.balanceOf(address(this));
            if (amount == 0) {
                if (balance > 0) {
                    bpspTUsdToken.transfer(spender, balance);
                }
                return;
            }

            // aToken on transfer can lost/add 1 wei. On lost we need correct amount
            if (balance + 1 == amount) {
                amount = amount - 1;
            }

            require(
                balance >= amount,
                "Usdc2BpspTUsdTokenExchange: Not enough bpspTUsdToken"
            );

            // move assets to connector
            bpspTUsdToken.transfer(address(connectorBalancer), amount);

            // correct exchangeAmount if we got diff on aToken transfer
            uint256 onConnectorBalance = bpspTUsdToken.balanceOf(address(connectorBalancer));
            if (onConnectorBalance < amount) {
                amount = onConnectorBalance;
            }
            uint256 withdrewAmount = connectorBalancer.unstake(address(usdcToken), amount, receiver);

            //TODO: may be add some checks for withdrewAmount

            // transfer back unused amount
            uint256 unusedBalance = bpspTUsdToken.balanceOf(address(this));
            if (unusedBalance > 0) {
                bpspTUsdToken.transfer(spender, unusedBalance);
            }
        }
    }
}
