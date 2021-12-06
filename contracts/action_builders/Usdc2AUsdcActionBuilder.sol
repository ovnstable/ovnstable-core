// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";

contract Usdc2AUsdcActionBuilder is IActionBuilder {
    bytes32 constant ACTION_CODE = keccak256("Usc2AUsdc");

    ITokenExchange public tokenExchange;
    IERC20 public usdcToken;
    IERC20 public aUsdcToken;
    IActionBuilder public usdc2IdleUsdcActionBuilder;

    constructor(
        address _tokenExchange,
        address _usdcToken,
        address _aUsdcToken,
        address _usdc2IdleUsdcActionBuilder
    ) {
        require(_tokenExchange != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_usdc2IdleUsdcActionBuilder != address(0), "Zero address not allowed");

        tokenExchange = ITokenExchange(_tokenExchange);
        usdcToken = IERC20(_usdcToken);
        aUsdcToken = IERC20(_aUsdcToken);
        usdc2IdleUsdcActionBuilder = IActionBuilder(_usdc2IdleUsdcActionBuilder);
    }

    function getActionCode() external pure override returns (bytes32) {
        return ACTION_CODE;
    }

    function buildAction(
        IMark2Market.BalanceAssetPrices[] memory assetPrices,
        ExchangeAction[] memory actions
    ) external view override returns (ExchangeAction memory) {
        // get diff from iteration over prices because can't use mapping in memory params to external functions
        IMark2Market.BalanceAssetPrices memory usdcPrices;
        IMark2Market.BalanceAssetPrices memory aUsdcPrices;
        for (uint8 i = 0; i < assetPrices.length; i++) {
            if (assetPrices[i].asset == address(usdcToken)) {
                usdcPrices = assetPrices[i];
                continue;
            }
            if (assetPrices[i].asset == address(aUsdcToken)) {
                aUsdcPrices = assetPrices[i];
                continue;
            }
        }

        // get diffUsdc2IdleUsdc to correct current diff
        ExchangeAction memory usdc2IdleUsdcAction;
        bytes32 usdc2IdleUsdcActionCode = usdc2IdleUsdcActionBuilder.getActionCode();
        bool foundDependencyAction = false;
        for (uint8 i = 0; i < actions.length; i++) {
            // here we need USDC diff to make action right
            if (actions[i].code == usdc2IdleUsdcActionCode) {
                usdc2IdleUsdcAction = actions[i];
                foundDependencyAction = true;
                break;
            }
        }
        require(foundDependencyAction, "Usdc2AUsdcActionBuilder: Required action not in action list, check calc ordering");

        // use usdc diff to start calc diff
        int256 diff = usdcPrices.diffToTarget;

        // correct diff value by usdc2AUsdc diff
        if (address(usdcToken) == address(usdc2IdleUsdcAction.from)) {
            // if in action move usdc->usdcIdle then we should decrease diff (sub)
            diff = diff - int256(usdc2IdleUsdcAction.amount);
        } else {
            // if in action move usdcIdle->usdc then we should increase diff (add)
            diff = diff + int256(usdc2IdleUsdcAction.amount);
        }

        uint256 amount;
        IERC20 from;
        IERC20 to;
        bool targetIsZero;
        if (usdcPrices.targetIsZero || diff < 0) {
            amount = uint256(- diff);
            from = usdcToken;
            to = aUsdcToken;
            targetIsZero = usdcPrices.targetIsZero;
        } else {
            amount = uint256(diff);
            from = aUsdcToken;
            to = usdcToken;
            targetIsZero = aUsdcPrices.targetIsZero;
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
