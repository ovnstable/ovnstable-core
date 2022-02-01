// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";
import "../registries/Portfolio.sol";
import "../interfaces/IPriceGetter.sol";

contract AUsdc2A3CrvActionBuilder is IActionBuilder {
    bytes32 constant ACTION_CODE = keccak256("AUsdc2A3Crv");

    ITokenExchange public tokenExchange;
    IERC20 public aUsdcToken;
    IERC20 public a3CrvToken;
    IActionBuilder public usdc2AUsdcActionBuilder;
    IActionBuilder public a3Crv2A3CrvGaugeActionBuilder;
    Portfolio public portfolio;

    constructor(
        address _tokenExchange,
        address _aUsdcToken,
        address _a3CrvToken,
        address _usdc2AUsdcActionBuilder,
        address _a3Crv2A3CrvGaugeActionBuilder,
        address _portfolio
    ) {
        require(_tokenExchange != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");
        require(_usdc2AUsdcActionBuilder != address(0), "Zero address not allowed");
        require(_a3Crv2A3CrvGaugeActionBuilder != address(0), "Zero address not allowed");
        require(_portfolio != address(0), "Zero address not allowed");

        tokenExchange = ITokenExchange(_tokenExchange);
        aUsdcToken = IERC20(_aUsdcToken);
        a3CrvToken = IERC20(_a3CrvToken);
        usdc2AUsdcActionBuilder = IActionBuilder(_usdc2AUsdcActionBuilder);
        a3Crv2A3CrvGaugeActionBuilder = IActionBuilder(_a3Crv2A3CrvGaugeActionBuilder);
        portfolio = Portfolio(_portfolio);
    }

    function getActionCode() external pure override returns (bytes32) {
        return ACTION_CODE;
    }

    function buildAction(
        IMark2Market.BalanceAssetPrices[] memory assetPrices,
        ExchangeAction[] memory actions
    ) external view override returns (ExchangeAction memory) {
        // get a3CrvPriceGetter
        IPriceGetter a3CrvPriceGetter = IPriceGetter(portfolio.getAssetInfo(address(a3CrvToken)).priceGetter);

        // get diff from iteration over prices because can't use mapping in memory params to external functions
        IMark2Market.BalanceAssetPrices memory aUsdcPrices;
        IMark2Market.BalanceAssetPrices memory a3CrvPrices;
        for (uint8 i = 0; i < assetPrices.length; i++) {
            if (assetPrices[i].asset == address(aUsdcToken)) {
                aUsdcPrices = assetPrices[i];
            } else if (assetPrices[i].asset == address(a3CrvToken)) {
                a3CrvPrices = assetPrices[i];
            }
        }

        // get diffUsdc2AUsdc and diffA3Crv2A3CrvGauge to correct current diff
        ExchangeAction memory usdc2AUsdcAction;
        ExchangeAction memory a3Crv2A3CrvGaugeAction;
        bool foundUsdc2AUsdcAction = false;
        bool foundA3Crv2A3CrvGaugeAction = false;
        for (uint8 i = 0; i < actions.length; i++) {
            // here we need USDC diff to make action right
            if (actions[i].code == usdc2AUsdcActionBuilder.getActionCode()) {
                usdc2AUsdcAction = actions[i];
                foundUsdc2AUsdcAction = true;
            } else if (actions[i].code == a3Crv2A3CrvGaugeActionBuilder.getActionCode()) {
                a3Crv2A3CrvGaugeAction = actions[i];
                foundA3Crv2A3CrvGaugeAction = true;
            }
        }
        require(foundUsdc2AUsdcAction, "Usdc2AUsdcActionBuilder: Required action not in action list, check calc ordering");
        require(foundA3Crv2A3CrvGaugeAction, "A3Crv2A3CrvGaugeActionBuilder: Required action not in action list, check calc ordering");

        // use aUsdc diff to start calc diff
        int256 diffAUsdc = aUsdcPrices.diffToTarget;

        // correct diff value by usdc2AUsdc diff
        if (address(aUsdcToken) == address(usdc2AUsdcAction.to)) {
            // if in action move aUsdc->usdc then we should decrease diff (sub)
            diffAUsdc = diffAUsdc - int256(usdc2AUsdcAction.amount);
        } else {
            // if in action move usdc->aUsdc then we should increase diff (add)
            diffAUsdc = diffAUsdc + int256(usdc2AUsdcAction.amount);
        }

        // use a3Crv diff to start calc diff
        int256 diffA3Crv = a3CrvPrices.diffToTarget;

        // correct diff value by a3Crv2A3CrvGauge diff
        if (address(a3CrvToken) == address(a3Crv2A3CrvGaugeAction.to)) {
            // if in action move a3CrvGauge->a3Crv then we should decrease diff (sub)
            diffA3Crv = diffA3Crv - int256(a3Crv2A3CrvGaugeAction.amount);
        } else {
            // if in action move a3Crv->a3CrvGauge then we should increase diff (add)
            diffA3Crv = diffA3Crv + int256(a3Crv2A3CrvGaugeAction.amount);
        }

        uint256 amount;
        IERC20 from;
        IERC20 to;
        bool targetIsZero;
        //TODO: need to define needed of usage for targetIsZero
        int256 diff = diffAUsdc - diffA3Crv * int256(a3CrvPriceGetter.getUsdcBuyPrice()) / int256(a3CrvPriceGetter.denominator());
        if (diff < 0) {
            if (diffAUsdc < 0) {
                amount = uint256(- diffAUsdc);
            } else {
                amount = uint256(diffAUsdc);
            }
            from = aUsdcToken;
            to = a3CrvToken;
            targetIsZero = aUsdcPrices.targetIsZero;
        } else {
            if (diffA3Crv < 0) {
                amount = uint256(- diffA3Crv);
            } else {
                amount = uint256(diffA3Crv);
            }
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
