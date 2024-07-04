// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibAccessControl} from "../libraries/core/LibAccessControl.sol";
import {LibCoreStorage} from "../libraries/core/LibCoreStorage.sol";
import "./Constants.sol";
import "./external/IRoleManager.sol";

contract Modifiers {

    modifier onlyRole(bytes32 role) {
        LibAccessControl.checkRole(role);
        _;
    }

    modifier onlyDiamond() {
        require(LibCoreStorage.coreStorage().diamond == msg.sender, "Restricted to Diamond");
        _;
    }

    modifier onlyAdmin() {
        require(LibAccessControl.hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to Admin");
        _;
    }

    modifier onlyUnit() {
        address roleManager = LibCoreStorage.coreStorage().roleManager;
        require(LibAccessControl.hasRole(UNIT_ROLE, msg.sender) || IRoleManager(roleManager).hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    modifier onlyPortfolioAgent() {
        address roleManager = LibCoreStorage.coreStorage().roleManager;
        require(LibAccessControl.hasRole(PORTFOLIO_AGENT_ROLE, msg.sender) || IRoleManager(roleManager).hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier onlyExchanger() {
        address exchanger = LibCoreStorage.coreStorage().exchanger;
        require(exchanger == msg.sender, "Restricted to EXCHANGER");
        _;
    }
}
