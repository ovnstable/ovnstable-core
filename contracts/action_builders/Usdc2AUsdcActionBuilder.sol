// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";
import "../registries/Portfolio.sol";
import "../interfaces/IPriceGetter.sol";

contract Usdc2AUsdcActionBuilder is IActionBuilder {
    bytes32 constant ACTION_CODE = keccak256("Usc2AUsdc");

    ITokenExchange public tokenExchange;
    IERC20 public usdcToken;
    IERC20 public aUsdcToken;
    IERC20 public vimUsdToken;
    IERC20 public idleUsdcToken;
    IERC20 public bpspTUsdToken;
    IActionBuilder public usdc2VimUsdActionBuilder;
    IActionBuilder public usdc2IdleUsdcActionBuilder;
    IActionBuilder public usdc2BpspTUsdActionBuilder;
    Portfolio public portfolio;

    constructor(
        address _tokenExchange,
        address _usdcToken,
        address _aUsdcToken,
        address _vimUsdToken,
        address _idleUsdcToken,
        address _bpspTUsdToken,
        address _usdc2VimUsdActionBuilder,
        address _usdc2IdleUsdcActionBuilder,
        address _usdc2BpspTUsdActionBuilder,
        address _portfolio
    ) {
        require(_tokenExchange != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_aUsdcToken != address(0), "Zero address not allowed");
        require(_vimUsdToken != address(0), "Zero address not allowed");
        require(_idleUsdcToken != address(0), "Zero address not allowed");
        require(_bpspTUsdToken != address(0), "Zero address not allowed");
        require(_usdc2VimUsdActionBuilder != address(0), "Zero address not allowed");
        require(_usdc2IdleUsdcActionBuilder != address(0), "Zero address not allowed");
        require(_usdc2BpspTUsdActionBuilder != address(0), "Zero address not allowed");
        require(_portfolio != address(0), "Zero address not allowed");

        tokenExchange = ITokenExchange(_tokenExchange);
        usdcToken = IERC20(_usdcToken);
        aUsdcToken = IERC20(_aUsdcToken);
        vimUsdToken = IERC20(_vimUsdToken);
        idleUsdcToken = IERC20(_idleUsdcToken);
        bpspTUsdToken = IERC20(_bpspTUsdToken);
        usdc2VimUsdActionBuilder = IActionBuilder(_usdc2VimUsdActionBuilder);
        usdc2IdleUsdcActionBuilder = IActionBuilder(_usdc2IdleUsdcActionBuilder);
        usdc2BpspTUsdActionBuilder = IActionBuilder(_usdc2BpspTUsdActionBuilder);
        portfolio = Portfolio(_portfolio);
    }

    function getActionCode() external pure override returns (bytes32) {
        return ACTION_CODE;
    }

    function buildAction(
        IMark2Market.BalanceAssetPrices[] memory assetPrices,
        ExchangeAction[] memory actions
    ) external view override returns (ExchangeAction memory) {
        // get vimUsdPriceGetter, idleUsdcPriceGetter, bpspTUsdPriceGetter
        IPriceGetter vimUsdPriceGetter = IPriceGetter(portfolio.getAssetInfo(address(vimUsdToken)).priceGetter);
        IPriceGetter idleUsdcPriceGetter = IPriceGetter(portfolio.getAssetInfo(address(idleUsdcToken)).priceGetter);
        IPriceGetter bpspTUsdPriceGetter = IPriceGetter(portfolio.getAssetInfo(address(bpspTUsdToken)).priceGetter);

        // get diff from iteration over prices because can't use mapping in memory params to external functions
        IMark2Market.BalanceAssetPrices memory usdcPrices;
        IMark2Market.BalanceAssetPrices memory aUsdcPrices;
        for (uint8 i = 0; i < assetPrices.length; i++) {
            if (assetPrices[i].asset == address(usdcToken)) {
                usdcPrices = assetPrices[i];
            } else if (assetPrices[i].asset == address(aUsdcToken)) {
                aUsdcPrices = assetPrices[i];
            }
        }

        // get diff usdc2VimUsd and usdc2IdleUsdc to correct current diff
        ExchangeAction memory usdc2VimUsdAction;
        ExchangeAction memory usdc2IdleUsdcAction;
        ExchangeAction memory usdc2BpspTUsdAction;
        for (uint8 i = 0; i < actions.length; i++) {
            // here we need USDC diff to make action right
            if (actions[i].code == usdc2VimUsdActionBuilder.getActionCode()) {
                usdc2VimUsdAction = actions[i];
            } else if (actions[i].code == usdc2IdleUsdcActionBuilder.getActionCode()) {
                usdc2IdleUsdcAction = actions[i];
            } else if (actions[i].code == usdc2BpspTUsdActionBuilder.getActionCode()) {
                usdc2BpspTUsdAction = actions[i];
            }
        }
        require(address(usdc2VimUsdAction.to) != address(0), "Usdc2AUsdcActionBuilder: Required usdc2VimUsdAction not in action list, check calc ordering");
        require(address(usdc2IdleUsdcAction.to) != address(0), "Usdc2AUsdcActionBuilder: Required usdc2IdleUsdcAction not in action list, check calc ordering");
        require(address(usdc2BpspTUsdAction.to) != address(0), "Usdc2AUsdcActionBuilder: Required usdc2BpspTUsdAction not in action list, check calc ordering");

        // use usdc diff to start calc diff
        int256 diff = usdcPrices.diffToTarget;

        // correct diff value by usdc2VimUsd diff
        if (address(usdcToken) == address(usdc2VimUsdAction.to)) {
            // if in action move usdc->vimUsdc then we should decrease diff (sub)
            diff = diff - int256(usdc2VimUsdAction.amount * vimUsdPriceGetter.getUsdcBuyPrice() / vimUsdPriceGetter.denominator());
        } else {
            // if in action move vimUsdc->usdc then we should increase diff (add)
            diff = diff + int256(usdc2VimUsdAction.amount);
        }

        // correct diff value by usdc2IdleUsdc diff
        if (address(usdcToken) == address(usdc2IdleUsdcAction.to)) {
            // if in action move usdc->usdcIdle then we should decrease diff (sub)
            diff = diff - int256(usdc2IdleUsdcAction.amount * idleUsdcPriceGetter.getUsdcBuyPrice() / idleUsdcPriceGetter.denominator());
        } else {
            // if in action move usdcIdle->usdc then we should increase diff (add)
            diff = diff + int256(usdc2IdleUsdcAction.amount);
        }

        // correct diff value by usdc2BpspTUsd diff
        if (address(usdcToken) == address(usdc2BpspTUsdAction.to)) {
            // if in action move usdc->usdcIdle then we should decrease diff (sub)
            diff = diff - int256(usdc2BpspTUsdAction.amount * bpspTUsdPriceGetter.getUsdcBuyPrice() / bpspTUsdPriceGetter.denominator());
        } else {
            // if in action move usdcIdle->usdc then we should increase diff (add)
            diff = diff + int256(usdc2BpspTUsdAction.amount);
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
