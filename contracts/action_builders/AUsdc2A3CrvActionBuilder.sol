// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";

contract AUsdc2A3CrvActionBuilder is IActionBuilder {
    bytes32 constant ACTION_CODE = keccak256("AUsdc2A3Crv");

    ITokenExchange public tokenExchange;
    IERC20 public aUsdcToken;
    IERC20 public a3CrvToken;
    IActionBuilder public usdc2AUsdcActionBuilder;

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
        IMark2Market.BalanceAssetPrices[] memory assetPrices,
        ExchangeAction[] memory actions
    ) external view override returns (ExchangeAction memory) {
        // get diff from iteration over prices because can't use mapping in memory params to external functions
        IMark2Market.BalanceAssetPrices memory aUsdcPrices;
        IMark2Market.BalanceAssetPrices memory a3CrvPrices;
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
        require(foundDependencyAction, "AUsdc2A3CrvActionBuilder: Required action not in action list, check calc ordering");

        // use aUsdc diff to start calc diff
        int256 diff = aUsdcPrices.diffToTarget;

        // correct diff value by usdc2AUsdc diff
        if (address(aUsdcToken) == address(usdc2AUsdcAction.to)) {
            // if in action move aUsdc->usdc then we should decrease diff (sub)
            diff = diff - int256(usdc2AUsdcAction.amount);
        } else {
            // if in action move usdc->aUsdc then we should increase diff (add)
            diff = diff + int256(usdc2AUsdcAction.amount);
        }

        uint256 amount;
        IERC20 from;
        IERC20 to;
        bool targetIsZero;
        //TODO: need to define needed of usage for targetIsZero
        if (diff < 0) {
            amount = uint256(- diff);
            from = aUsdcToken;
            to = a3CrvToken;
            targetIsZero = aUsdcPrices.targetIsZero;
        } else {
            amount = uint256(diff);
            from = a3CrvToken;
            to = aUsdcToken;
            targetIsZero = a3CrvPrices.targetIsZero;
        }

        ExchangeAction memory action = ExchangeAction(
            tokenExchange,
            ACTION_CODE,
            from,
            to,
            amount,
            targetIsZero,
            false
        );

        return action;
    }
}
