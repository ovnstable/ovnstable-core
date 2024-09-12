// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibAccessControl} from "../libraries/core/LibAccessControl.sol";
import {LibCoreStorage} from "../libraries/core/LibCoreStorage.sol";
import "./Constants.sol";

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
}