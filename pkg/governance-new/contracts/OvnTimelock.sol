// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts-upgradeable/governance/TimelockControllerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract OvnTimelock is TimelockControllerUpgradeable, UUPSUpgradeable {


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _setRoleAdmin(PROPOSER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(EXECUTOR_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(CANCELLER_ROLE, DEFAULT_ADMIN_ROLE);

        // self administration
        // Timelock must be self admin
        _setupRole(DEFAULT_ADMIN_ROLE, address(this));

        // deployer administrator
        // Revoke role after test on real chain
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

    }


    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}


}
