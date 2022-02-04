// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IStrategy.sol";
import "../connectors/idle/interfaces/IIdleToken.sol";

import "hardhat/console.sol";
import "../Vault.sol";

contract StrategyIdle is IStrategy, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IIdleToken public idleToken;
    IERC20 public usdc;
    Vault public vault;

    // --- events

    event StrategyIdleUpdate(address idleToken);

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
        address _usdc,
        address _vault) external onlyAdmin {

        require(_idleToken != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        require(_vault != address(0), "Zero address not allowed");
        idleToken = IIdleToken(_idleToken);
        vault = Vault(_vault);
        usdc = IERC20(_usdc);

        emit StrategyIdleUpdate(_idleToken);
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
        require(_asset == address(usdc), "Some token not compatible");

        vault.transfer(usdc, address(this), _amount);

        usdc.approve(address(idleToken), _amount);
        uint256 mintedTokens = idleToken.mintIdleToken(_amount, true, _beneficiary);
        idleToken.transfer(_beneficiary, idleToken.balanceOf(address(this)));
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override returns (uint256) {
        require(_asset == address(usdc), "Some token not compatible");

        address current = address(this);

        uint256 tokenAmount = _amount + (_amount / 100 * 1);
        // fee 5% - misinformation
        tokenAmount = tokenAmount * (10 ** 18) / idleToken.tokenPrice();

        vault.transfer(idleToken, address(this), tokenAmount);

        uint256 redeemedTokens = idleToken.redeemIdleToken(tokenAmount);
        usdc.transfer(_beneficiary, usdc.balanceOf(current));

        console.log('Redeem %s', redeemedTokens / 10 ** 6);
        console.log('Amount %s', _amount / 10 ** 6);

        require(redeemedTokens >= _amount, 'Returned value less than requested amount');
        return redeemedTokens;
    }

    function liquidationValue(address _holder) external override view returns (uint256) {
        uint256 balance = idleToken.balanceOf(_holder) / 10 ** 12;
        uint256 price = idleToken.tokenPrice();
        uint256 result = (balance * price);
        return result / 10 ** 6;
    }

    function netAssetValue(address _holder) external override view returns (uint256){
        uint256 balance = idleToken.balanceOf(_holder) / 10 ** 12;
        uint256 price = idleToken.tokenPrice();
        uint256 result = (balance * price);
        return result / 10 ** 6;
    }

    function claimRewards(address _beneficiary) external override returns (uint256){
        return 0;
    }
}
