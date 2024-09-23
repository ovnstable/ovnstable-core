// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./Constants.sol";
import "./IRoleManager.sol";
import "hardhat/console.sol";

contract Modifiers is AccessControlUpgradeable {
    
    address public exchange;
    IRoleManager public roleManager;

    event RoleManagerUpdated(address roleManager);

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager.hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier onlyUnit(){
        require(roleManager.hasRole(UNIT_ROLE, msg.sender), "Restricted to Unit");
        _;
    }

    modifier onlyDepositor(){
        require(roleManager.hasRole(DEPOSITOR_ROLE, msg.sender), "Restricted to Depositor");
        _;
    }

    /**
     * @dev Verifies that the caller is the Exchanger contract
     */
    modifier onlyExchanger() {
        require(exchange == _msgSender(), "Caller is not the EXCHANGER");
        _;
    }

    function setRoleManager(address _roleManager) external onlyAdmin {
        require(_roleManager != address(0), "Zero address not allowed");
        roleManager = IRoleManager(_roleManager);
        emit RoleManagerUpdated(_roleManager);
    }
}