// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IStrategy.sol";
import "../connectors/idle/interfaces/IIdleToken.sol";
import "../connectors/QuickswapExchange.sol";

import "hardhat/console.sol";

contract StrategyIdle is IStrategy, QuickswapExchange, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PORTFOLIO_MANAGER = keccak256("UPGRADER_ROLE");

    address public portfolioManager;

    IERC20 public usdcToken;
    IIdleToken public idleToken;
    IERC20 public wmaticToken;

    uint256 public usdcTokenDenominator;
    uint256 public idleTokenDenominator;
    uint256 public wmaticTokenDenominator;


    // --- events

    event StrategyIdleUpdatedTokens(address usdcToken, address idleToken, address wmaticToken,
        uint256 usdcTokenDenominator, uint256 idleTokenDenominator, uint256 wmaticTokenDenominator);

    event StrategyIdleUpdatedParams(address uniswapRouter);

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioManager() {
        require(hasRole(PORTFOLIO_MANAGER, msg.sender), "Restricted to PORTFOLIO_MANAGER");
        _;
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _idleToken,
        address _wmaticToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_idleToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        idleToken = IIdleToken(_idleToken);
        wmaticToken = IERC20(_wmaticToken);

        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        idleTokenDenominator = 10 ** IERC20Metadata(_idleToken).decimals();
        wmaticTokenDenominator = 10 ** IERC20Metadata(_wmaticToken).decimals();

        emit StrategyIdleUpdatedTokens(_usdcToken, _idleToken, _wmaticToken,
            usdcTokenDenominator, idleTokenDenominator, wmaticTokenDenominator);
    }

    function setParams(
        address _uniswapRouter
    ) external onlyAdmin {

        require(_uniswapRouter != address(0), "Zero address not allowed");

        setUniswapRouter(_uniswapRouter);

        emit StrategyIdleUpdatedParams(_uniswapRouter);
    }

    function setPortfolioManager(address _value) public onlyAdmin {
        require(_value != address(0), "Zero address not allowed");

        revokeRole(PORTFOLIO_MANAGER, portfolioManager);
        grantRole(PORTFOLIO_MANAGER, _value);

        portfolioManager = _value;
        emit PortfolioManagerUpdated(_value);
    }


    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


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

        // fee 1% - misinformation
        uint256 fixedAmount = _amount * 101 / 100;

        // 18 = 18 + 6 - 6
        uint256 tokenAmount = idleTokenDenominator * fixedAmount / idleToken.tokenPrice();

        uint256 redeemedTokens = idleToken.redeemIdleToken(tokenAmount);
        usdcToken.transfer(_beneficiary, redeemedTokens);

        console.log('Redeem %s', redeemedTokens / usdcTokenDenominator);
        console.log('Amount %s', _amount / usdcTokenDenominator);

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
            uint256 wmaticUsdc = swapTokenToUsdc(address(wmaticToken), address(usdcToken), wmaticTokenDenominator,
                address(this), address(_to), wmaticBalance);
            totalUsdc += wmaticUsdc;
        }

        return totalUsdc;
    }
}
