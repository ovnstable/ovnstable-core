// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IConnector.sol";

contract AUsdc2A3CrvTokenExchange is ITokenExchange {
    IConnector public curveConnector;
    IERC20 public aUsdcToken;
    IERC20 public a3CrvToken;
    uint256 aUsdcDenominator;

    constructor(
        address _curveConnector,
        address _aUsdcToken,
        address _a3CrvToken
    ) {
        require(_curveConnector != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");

        curveConnector = IConnector(_curveConnector);
        aUsdcToken = IERC20(_aUsdcToken);
        a3CrvToken = IERC20(_a3CrvToken);

        aUsdcDenominator = 10 ** (18 - IERC20Metadata(address(aUsdcToken)).decimals());
    }

    function exchange(
        address spender,
        IERC20 from,
        address receiver,
        IERC20 to,
        uint256 amount
    ) external override {
        require(
            (from == aUsdcToken && to == a3CrvToken) || (from == a3CrvToken && to == aUsdcToken),
            "AUsdc2A3CrvTokenExchange: Some token not compatible"
        );

        if (amount == 0) {
            uint256 fromBalance = from.balanceOf(address(this));
            if (fromBalance > 0) {
                from.transfer(spender, fromBalance);
            }
            return;
        }

        if (from == aUsdcToken && to == a3CrvToken) {
            //TODO: denominator usage
            amount = amount / aUsdcDenominator;

            uint256 balance = aUsdcToken.balanceOf(address(this));
            // if amount eq 0 after normalization transfer back balance and skip staking
            if (amount == 0) {
                if (balance > 0) {
                    aUsdcToken.transfer(spender, balance);
                }
                return;
            }

            // aToken on transfer can lost/add 1 wei. On lost we need correct amount
            if (balance + 1 == amount) {
                amount = amount - 1;
            }

            require(
                balance >= amount,
                "AUsdc2A3CrvTokenExchange: Not enough aUsdcToken tokens"
            );

            // move assets to connector
            aUsdcToken.transfer(address(curveConnector), amount);

            // correct exchangeAmount if we got diff on aToken transfer
            uint256 onCurveConnectorBalance = aUsdcToken.balanceOf(address(curveConnector));
            if (onCurveConnectorBalance < amount) {
                amount = onCurveConnectorBalance;
            }
            curveConnector.stake(address(aUsdcToken), amount, receiver);

            // transfer back unused amount
            uint256 unusedBalance = aUsdcToken.balanceOf(address(this));
            if (unusedBalance > 0) {
                aUsdcToken.transfer(spender, unusedBalance);
            }
        } else {
            // amount is in usdc, so we don't need correct price bacause of aUsdc:usdc is 1:1
            // but may be should use PriceGetter with extra gas cost
            //TODO: denominator usage
            uint256 aUsdcAmount = amount / aUsdcDenominator;

            uint a3CrvBalance = a3CrvToken.balanceOf(address(this));
            //TODO: here we check expected amount of usdc equivalent - so that is wrong
            //      and we should use PriceGetter or another way to find equivalent for checking a3Crv
            //      balance
            require(
                a3CrvBalance >= amount,
                "AUsdc2A3CrvTokenExchange: Not enough a3CrvToken"
            );

            //TODO: add check that we can withdraw more than zero by call Curve pool and get estimate
            //      aUsdc amount for our LP tokens
            // check after denormilization
            if (aUsdcAmount == 0) {
                a3CrvToken.transfer(spender, a3CrvBalance);
                return;
            }

            try a3CrvToken.transfer(address(curveConnector), amount) {
                try curveConnector.unstake(address(aUsdcToken), aUsdcAmount, receiver) returns (
                    uint256 withdrewAmount
                ) {} catch Error(string memory reason) {
                    revert(reason);
                } catch {
                    revert(string(abi.encodePacked("curveConnector.unstake")));
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert(string(abi.encodePacked("a3CrvToken.transfer")));
            }

            // uint256 a3CrvAmount = amount;
            // require(
            //     a3CrvToken.balanceOf(address(this)) >= a3CrvAmount,
            //     "AUsdc2A3CrvTokenExchange: Not enough a3CrvToken"
            // );

            // a3CrvToken.transfer(address(curveConnector), a3CrvAmount);
            // uint256 withdrewAmount = curveConnector.unstake(address(aUsdcToken), amount, receiver);

            // transfer back unused tokens
            uint256 unusedA3CrvBalance = a3CrvToken.balanceOf(address(this));
            if (unusedA3CrvBalance > 0) {
                a3CrvToken.transfer(spender, unusedA3CrvBalance);
            }
            //TODO: may be add some checks for withdrewAmount
        }
    }
}
