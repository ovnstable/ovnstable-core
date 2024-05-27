// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @dev Manager role for all contracts of USD+
 * Single point for assigning roles
 * Allow to set role in this place and this will be available for other contracts
 */
contract RoleManager is Initializable, AccessControlEnumerableUpgradeable, UUPSUpgradeable {

    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _grantRole(UNIT_ROLE, 0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055); // Payout
        _grantRole(UNIT_ROLE, 0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9); // Dev4

        _setRoleAdmin(UNIT_ROLE, PORTFOLIO_AGENT_ROLE);

        _grantRole(PORTFOLIO_AGENT_ROLE, 0xe497285e466227F4E8648209E34B465dAA1F90a0); // OVN Treasure
        _grantRole(PORTFOLIO_AGENT_ROLE, 0xcd8562CD85fD93C7e2E80B4Cf69097E5562a76f9); // Dev4
    }

    function _authorizeUpgrade(address newImplementation) internal onlyRole(DEFAULT_ADMIN_ROLE) override {}
}
