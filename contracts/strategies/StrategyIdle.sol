// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../interfaces/IStrategy.sol";
import "../connectors/idle/interfaces/IIdleToken.sol";

import "hardhat/console.sol";

contract StrategyIdle is IStrategy, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IERC20 public usdcToken;
    IIdleToken public idleToken;
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
        address _usdcToken,
        address _idleToken
    ) external onlyAdmin {
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_idleToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        idleToken = IIdleToken(_idleToken);
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

        usdcToken.transferFrom(_beneficiary, address(this), _amount);

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

        uint256 tokenAmount = idleTokenDenominator * _amount / idleToken.tokenPrice();
        console.log('Token amount %s', tokenAmount);

        idleToken.transferFrom(_beneficiary, current, tokenAmount);

        uint256 redeemedTokens = idleToken.redeemIdleToken(tokenAmount);
        console.log('Redeem tokens %s', redeemedTokens);
        console.log('USDC  %s', usdcToken.balanceOf(current));
        console.log('USDC  %s', usdcToken.balanceOf(_beneficiary));
        console.log('IDLE %s', idleToken.balanceOf(_beneficiary));
        console.log('IDLE %s', idleToken.balanceOf(current));

        usdc.transfer(_beneficiary, usdcToken.balanceOf(current));

        console.log('USDC  %s', usdcToken.balanceOf(current));
        console.log('USDC  %s', usdcToken.balanceOf(_beneficiary));
        console.log('IDLE %s', idleToken.balanceOf(_beneficiary));
        console.log('IDLE %s', idleToken.balanceOf(current));

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
