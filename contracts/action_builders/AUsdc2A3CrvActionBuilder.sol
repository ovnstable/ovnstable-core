// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";

contract AUsdc2A3CrvActionBuilder is IActionBuilder {
    bytes32 constant ACTION_CODE = keccak256("AUsdc2A3Crv");

    ITokenExchange tokenExchange;
    IERC20 aUsdcToken;
    IERC20 a3CrvToken;
    IActionBuilder usdc2AUsdcActionBuilder;

    constructor(
        address _tokenExchange,
        address _aUsdcToken,
        address _a3CrvToken,
        address _usdc2AUsdcActionBuilder
    ) {
        require(_tokenExchange != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");
        require(_usdc2AUsdcActionBuilder != address(0), "Zero address not allowed");

        tokenExchange = ITokenExchange(_tokenExchange);
        aUsdcToken = IERC20(_aUsdcToken);
        a3CrvToken = IERC20(_a3CrvToken);
        usdc2AUsdcActionBuilder = IActionBuilder(_usdc2AUsdcActionBuilder);
    }

    function getActionCode() external pure override returns (bytes32) {
        return ACTION_CODE;
    }

    function buildAction(
        IMark2Market.TotalAssetPrices memory totalAssetPrices,
        ExchangeAction[] memory actions
    ) external view override returns (ExchangeAction memory) {
        IMark2Market.AssetPrices[] memory assetPrices = totalAssetPrices.assetPrices;

        // get diff from iteration over prices because can't use mapping in memory params to external functions
        IMark2Market.AssetPrices memory aUsdcPrices;
        IMark2Market.AssetPrices memory a3CrvPrices;
        for (uint8 i = 0; i < assetPrices.length; i++) {
            if (assetPrices[i].asset == address(aUsdcToken)) {
                aUsdcPrices = assetPrices[i];
                continue;
            }
            if (assetPrices[i].asset == address(a3CrvToken)) {
                a3CrvPrices = assetPrices[i];
                continue;
            }
        }

        // get diffUsdc2AUsdc to correct current diff
        ExchangeAction memory usdc2AUsdcAction;
        bytes32 usdc2AUsdcActionCode = usdc2AUsdcActionBuilder.getActionCode();
        bool foundDependencyAction = false;
        for (uint8 i = 0; i < actions.length; i++) {
            // here we need USDC diff to make action right
            if (actions[i].code == usdc2AUsdcActionCode) {
                usdc2AUsdcAction = actions[i];
                foundDependencyAction = true;
                break;
            }
        }
        require(foundDependencyAction, "Required action not in action list, check calc ordering");

        // use aUsdc diff to start calc diff
        uint256 diff = aUsdcPrices.diffToTarget;
        int8 sign = aUsdcPrices.diffToTargetSign;

        // correct diff value by usdc2AUsdc diff
        if (address(aUsdcToken) == address(usdc2AUsdcAction.to)) {
            // if in action move aUsdc->usdc then we should decrease diff (sub)
            (diff, sign) = unsignSub(diff, sign, usdc2AUsdcAction.amount);
        } else {
            // if in action move usdc->aUsdc then we should encrease diff (add)
            (diff, sign) = unsignAdd(diff, sign, usdc2AUsdcAction.amount);
        }

        IERC20 from;
        IERC20 to;
        bool targetIsZero;
        //TODO: need to define needed of usage for targetIsZero
        if (sign < 0) {
            from = aUsdcToken;
            to = a3CrvToken;
            targetIsZero = aUsdcPrices.targetIsZero;
        } else {
            from = a3CrvToken;
            to = aUsdcToken;
            targetIsZero = a3CrvPrices.targetIsZero;
        }

        ExchangeAction memory action = ExchangeAction(
            tokenExchange,
            ACTION_CODE,
            from,
            to,
            diff,
            targetIsZero,
            false
        );

        return action;
    }

    function unsignAdd(
        uint256 value,
        int8 sign,
        uint256 addAmount
    ) internal pure returns (uint256, int8) {
        int8 resSign = sign;
        if (sign < 0) {
            if (value > addAmount) {
                value = value - addAmount;
            } else {
                value = addAmount - value;
                resSign = int8(1);
            }
        } else {
            value = value + addAmount;
        }
        return (value, resSign);
    }

    function unsignSub(
        uint256 value,
        int8 sign,
        uint256 subAmount
    ) internal pure returns (uint256, int8) {
        int8 resSign = sign;
        if (sign > 0) {
            if (value > subAmount) {
                value = value - subAmount;
            } else {
                value = subAmount - value;
                resSign = int8(-1);
            }
        } else {
            value = value + subAmount;
        }
        return (value, resSign);
    }
}
