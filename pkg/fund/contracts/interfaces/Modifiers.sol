// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./Constants.sol";
import "./IRoleManager.sol";
import "hardhat/console.sol";

contract Modifiers is AccessControlUpgradeable {
    
    address public exchange;
    address public depositor;
    IRoleManager public roleManager;

    event RoleManagerUpdated(address roleManager);
    event ExchangerUpdated(address exchange);
    event DepositorUpdated(address depositor);

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

    /**
     * @dev Verifies that the caller is the Depositor
     */
    modifier onlyDepositor(){
        require(depositor == _msgSender(), "Restricted to Depositor");
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

    function setExchanger(address _exchanger) external onlyAdmin {
        require(_exchanger != address(0), "Exchanger is zero address");
        exchange = _exchanger;
        emit ExchangerUpdated(_exchanger);
    }

    function setDepositor(address _depositor) external onlyAdmin {
        require(_depositor != address(0), "Depositor is zero address");
        depositor = _depositor;
        emit DepositorUpdated(_depositor);
    }
}