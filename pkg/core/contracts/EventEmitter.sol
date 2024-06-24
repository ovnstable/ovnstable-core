// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@overnight-contracts/connectors/contracts/stuff/Inch.sol";

import "./interfaces/IEventEmitter.sol";
import "./interfaces/IBlockGetter.sol";
import "./interfaces/IRoleManager.sol";

contract EventEmitter is IEventEmitter, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");
    IRoleManager public roleManager;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    
    function emitEvent(StrategyType strategyType, uint256 profitFee, uint256 profit, uint256 loss, uint256 collectorAmount) external{
        emit PayoutEvent(msg.sender, strategyType, profitFee, profit, loss, collectorAmount);
    }


}
