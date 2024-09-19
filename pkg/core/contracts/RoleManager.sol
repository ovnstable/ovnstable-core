// SPDX-License-Identifier: UNLICENSED
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
    bytes32 public constant FREE_RIDER_ROLE = keccak256("FREE_RIDER_ROLE");
    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);


        _grantRole(UNIT_ROLE, 0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055); // Payout
        _grantRole(UNIT_ROLE, 0x05129E3CE8C566dE564203B0fd85111bBD84C424); // Dev

        _setRoleAdmin(FREE_RIDER_ROLE, PORTFOLIO_AGENT_ROLE);
        _setRoleAdmin(UNIT_ROLE, PORTFOLIO_AGENT_ROLE);

        _grantRole(PORTFOLIO_AGENT_ROLE, 0x0bE3f37201699F00C21dCba18861ed4F60288E1D); // PM Agent
        _grantRole(PORTFOLIO_AGENT_ROLE, 0xe497285e466227F4E8648209E34B465dAA1F90a0); // OVN Treasure
        _grantRole(PORTFOLIO_AGENT_ROLE, 0x05129E3CE8C566dE564203B0fd85111bBD84C424); // Dev

        _grantRole(DEPOSITOR_ROLE, 0x0); // max TODO: insert address from Max
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}
}
