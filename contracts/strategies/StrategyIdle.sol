// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IStrategy.sol";
import "../connectors/idle/interfaces/IIdleToken.sol";

import "hardhat/console.sol";
import "../Vault.sol";

contract StrategyIdle is IStrategy, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IIdleToken public idleToken;
    IERC20 public usdcToken;
    Vault public vault;
    uint256 public usdcTokenDenominator;
    uint256 public idleTokenDenominator;

    // --- events

    event StrategyIdleUpdate(address usdcToken, address idleToken, uint256 usdcTokenDenominator, uint256 idleTokenDenominator);

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

    // --- Setters

    function setParams(
        address _idleToken,
        address _usdcToken,
        address _vault
    ) external onlyAdmin {

        require(_idleToken != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_vault != address(0), "Zero address not allowed");
        idleToken = IIdleToken(_idleToken);
        vault = Vault(_vault);
        usdcToken = IERC20(_usdcToken);
        usdcTokenDenominator = 10 ** IERC20Metadata(address(_usdcToken)).decimals();
        idleTokenDenominator = 10 ** IERC20Metadata(address(_idleToken)).decimals();

        emit StrategyIdleUpdate(_usdcToken, _idleToken, usdcTokenDenominator, idleTokenDenominator);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // --- logic

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override {
        require(_asset == address(usdcToken), "Stake only in usdc");

        vault.transfer(usdcToken, address(this), _amount);

        usdcToken.approve(address(idleToken), _amount);

        uint256 mintedTokens = idleToken.mintIdleToken(_amount, true, _beneficiary);
        idleToken.transfer(_beneficiary, idleToken.balanceOf(address(this)));
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override returns (uint256) {
        require(_asset == address(usdcToken), "Stake only in usdc");

        address current = address(this);

        uint256 tokenAmount = _amount * 101 / 100;
        // fee 5% - misinformation
        tokenAmount = idleTokenDenominator * tokenAmount / idleToken.tokenPrice();

        vault.transfer(idleToken, address(this), tokenAmount);

        uint256 redeemedTokens = idleToken.redeemIdleToken(tokenAmount);
        usdcToken.transfer(_beneficiary, usdcToken.balanceOf(current));

        console.log('Redeem %s', redeemedTokens / 10 ** 6);
        console.log('Amount %s', _amount / 10 ** 6);

        require(redeemedTokens >= _amount, 'Returned value less than requested amount');
        return redeemedTokens;
    }

    function netAssetValue(address _holder) external override view returns (uint256) {
        uint256 balance = idleToken.balanceOf(_holder);
        uint256 price = idleToken.tokenPrice();
        // 18 + 6 - 18 = 6
        return balance * price / idleTokenDenominator;
    }

    function liquidationValue(address _holder) external override view returns (uint256) {
        uint256 balance = idleToken.balanceOf(_holder);
        uint256 price = idleToken.tokenPrice();
        // 18 + 6 - 18 = 6
        return balance * price / idleTokenDenominator;
    }

    function claimRewards(address _beneficiary) external override returns (uint256) {
        return 0;
    }
}
