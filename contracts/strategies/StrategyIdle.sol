// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../connectors/idle/interfaces/IIdleToken.sol";
import "../connectors/QuickswapExchange.sol";

import "./Strategy.sol";

import "hardhat/console.sol";

contract StrategyIdle is Strategy, QuickswapExchange {


    IERC20 public usdcToken;
    IIdleToken public idleToken;
    IERC20 public wmaticToken;
    uint256 public usdcTokenDenominator;
    uint256 public idleTokenDenominator;
    uint256 public wmaticTokenDenominator;

    // --- events

    event StrategyIdleUpdated(address usdcToken, address idleToken, address wmaticToken, address quickswapExchange,
        uint256 usdcTokenDenominator, uint256 idleTokenDenominator, uint256 wmaticTokenDenominator);

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(
        address _usdcToken,
        address _idleToken,
        address _wmaticToken,
        address _quickswapExchange
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_idleToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");
        require(_quickswapExchange != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        idleToken = IIdleToken(_idleToken);
        wmaticToken = IERC20(_wmaticToken);

        setSwapRouter(_quickswapExchange);
        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        idleTokenDenominator = 10 ** IERC20Metadata(_idleToken).decimals();
        wmaticTokenDenominator = 10 ** IERC20Metadata(_wmaticToken).decimals();

        emit StrategyIdleUpdated(_usdcToken, _idleToken, _wmaticToken, _quickswapExchange,
            usdcTokenDenominator, idleTokenDenominator, wmaticTokenDenominator);
    }


    // --- logic

    function stake(
        address _asset,
        uint256 _amount
    ) public override onlyPortfolioManager {
        require(_asset == address(usdcToken), "Stake only in usdc");

        usdcToken.approve(address(idleToken), _amount);
        uint256 mintedTokens = idleToken.mintIdleToken(_amount, true, address(this));
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override onlyPortfolioManager returns (uint256) {
        require(_asset == address(usdcToken), "Unstake only in usdc");

        uint256 tokenAmount = _amount + (_amount / 100 * 1);
        // fee 5% - misinformation
        tokenAmount = tokenAmount * (10 ** 18) / idleToken.tokenPrice();

        uint256 redeemedTokens = idleToken.redeemIdleToken(tokenAmount);
        usdcToken.transfer(_beneficiary, redeemedTokens);

        console.log('Redeem %s', redeemedTokens / 10 ** 6);
        console.log('Amount %s', _amount / 10 ** 6);

        require(redeemedTokens >= _amount, 'Returned value less than requested amount');
        return redeemedTokens;
    }

    function netAssetValue() external override view returns (uint256) {
        uint256 balance = idleToken.balanceOf(address(this));
        uint256 price = idleToken.tokenPrice();
        // 18 + 6 - 18 = 6
        return balance * price / idleTokenDenominator;
    }

    function liquidationValue() external override view returns (uint256) {
        uint256 balance = idleToken.balanceOf(address(this));
        uint256 price = idleToken.tokenPrice();
        // 18 + 6 - 18 = 6
        return balance * price / idleTokenDenominator;
    }

    function claimRewards(address _to) external override onlyPortfolioManager returns (uint256) {
        uint256 totalUsdc;

        uint256 wmaticBalance = wmaticToken.balanceOf(address(this));
        if (wmaticBalance != 0) {
            uint256 wmaticUsdc = swapTokenToUsdc(address(wmaticToken), address(usdcToken),
                wmaticTokenDenominator, address(this), address(_to), wmaticBalance);
            totalUsdc += wmaticUsdc;
        }

        emit Reward(totalUsdc);
        return totalUsdc;
    }
}
