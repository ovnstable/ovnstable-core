// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@overnight-contracts/connectors/contracts/stuff/BebopSettlement.sol';
import './interfaces/IRoleManager.sol';

contract BebopVault is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    using Address for address payable;
    using SafeERC20 for IERC20;

    // ---  fields

    mapping(address => bool) public allowedWithdrawers;
    address public bebopSettlement;

    // ---  events

    event ERC20Deposited(address indexed token, address indexed sender, uint256 amount);
    event ERC20Withdrawn(address indexed token, address indexed to, uint256 amount);
    event WithdrawerAdded(address indexed withdrawer);
    event WithdrawerRemoved(address indexed withdrawer);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), 'Restricted to admins');
        _;
    }

    modifier onlyAllowedWithdrawer() {
        require(allowedWithdrawers[msg.sender], 'Not allowed withdrawer');
        _;
    }

    // ---  setters

    function setBebopSettlement(address _bebopSettlement) external onlyAdmin {
        require(_bebopSettlement != address(0), 'Invalid bebop settlement');
        bebopSettlement = _bebopSettlement;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // --- contract logic

    function addWithdrawer(address withdrawer) external onlyAdmin {
        require(withdrawer != address(0), 'Zero address');
        allowedWithdrawers[withdrawer] = true;
        emit WithdrawerAdded(withdrawer);
    }

    function removeWithdrawer(address withdrawer) external onlyAdmin {
        allowedWithdrawers[withdrawer] = false;
        emit WithdrawerRemoved(withdrawer);
    }

    function withdrawERC20(address token, uint256 amount) external onlyAllowedWithdrawer {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit ERC20Withdrawn(token, msg.sender, amount);
    }

    function getERC20Balance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function approveERC20(address token, address spender, uint256 amount) external onlyAdmin {
        require(spender != address(0), 'Invalid spender');
        require(token != address(0), 'Invalid token');

        IERC20 erc20 = IERC20(token);
        if (erc20.allowance(address(this), spender) != 0) {
            erc20.safeApprove(spender, 0);
        }
        erc20.safeApprove(spender, amount);
    }

    function registerOrderSigner(address signer, bool allowed) external onlyAdmin {
        require(signer != address(0), 'Invalid signer');
        
        IBebopSettlement(bebopSettlement).registerAllowedOrderSigner(signer, allowed);
    }
}
