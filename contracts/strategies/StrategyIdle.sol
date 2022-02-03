// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../interfaces/IStrategy.sol";
import "../connectors/idle/interfaces/IIdleToken.sol";

import "hardhat/console.sol";

contract StrategyIdle is IStrategy, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    address public idleToken;


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

    function setParams(address _idleToken) external onlyAdmin {
        require(_idleToken != address(0), "Zero address not allowed");
        idleToken = _idleToken;
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
        IERC20(_asset).approve(idleToken, _amount);
        uint256 mintedTokens = IIdleToken(idleToken).mintIdleToken(_amount, true, _beneficiary);
        IERC20(idleToken).transfer(_beneficiary, mintedTokens);
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override returns (uint256) {
        uint256 redeemedTokens = IIdleToken(idleToken).redeemIdleToken(_amount);
        IERC20(_asset).transfer(_beneficiary, redeemedTokens);
        return redeemedTokens;
    }

    function liquidationValue(address _holder) external override view returns (uint256) {
        return 0;
    }

    function netAssetValue(address _holder) external override view returns (uint256){
        return 0;
    }

    function claimRewards(address _beneficiary) external override returns (uint256){
        return 0;
    }
}
