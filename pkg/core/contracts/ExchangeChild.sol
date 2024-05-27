// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "./interfaces/IPayoutManager.sol";
import "./interfaces/IUsdPlusToken.sol";
import "./interfaces/IRoleManager.sol";

contract ExchangeChild is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    uint256 public constant LIQ_DELTA_DM = 1e6;

    event UsdPlusUpdated(address usdPlus);
    event PayoutManagerUpdated(address payoutManager);
    event RoleManagerUpdated(address roleManager);
    event PayoutShortEvent(uint256 newDelta, uint256 nonRebaseDelta);    

    IUsdPlusToken public usdPlus;
    IPayoutManager public payoutManager;
    IRoleManager public roleManager;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admin");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) override {}

    function setUsdPlus(address _usdPlus) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        usdPlus = IUsdPlusToken(_usdPlus);
        emit UsdPlusUpdated(_usdPlus);
    }

    function setRoleManager(address _roleManager) external onlyAdmin {
        require(_roleManager != address(0), "Zero address not allowed");
        roleManager = IRoleManager(_roleManager);
        emit RoleManagerUpdated(_roleManager);
    }

    function setPayoutManager(address _payoutManager) external onlyAdmin {
        payoutManager = IPayoutManager(_payoutManager);
        emit PayoutManagerUpdated(_payoutManager);
    }

    function payout(uint256 newDelta) external onlyAdmin {

        require(newDelta > LIQ_DELTA_DM, "Negative rebase");

        uint256 totalNav = usdPlus.totalSupply() * newDelta / LIQ_DELTA_DM;
        (NonRebaseInfo [] memory nonRebaseInfo, uint256 nonRebaseDelta) = usdPlus.changeSupply(totalNav);
        usdPlus.mint(address(payoutManager), nonRebaseDelta);
        payoutManager.payoutDone(address(usdPlus), nonRebaseInfo);

        require(usdPlus.totalSupply() == totalNav,'total != nav');

        emit PayoutShortEvent(newDelta, nonRebaseDelta);
    }
}
