// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibAccessControl} from "../../libraries/core/LibAccessControl.sol";

contract AccessControlFacet {

    modifier onlyRole(bytes32 role) {
        LibAccessControl.checkRole(role);
        _;
    }

    function grantRole(
        bytes32 role,
        address account
    ) external onlyRole(getRoleAdmin(role)) {
        return LibAccessControl.grantRole(role, account);
    }

    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool) {
        return LibAccessControl.hasRole(role, account);
    }

    function getRoleAdmin(bytes32 role) public view returns (bytes32) {
        return LibAccessControl.getRoleAdmin(role);
    }

    function revokeRole(
        bytes32 role,
        address account
    ) external onlyRole(getRoleAdmin(role)) {
        return LibAccessControl.revokeRole(role, account);
    }

}
