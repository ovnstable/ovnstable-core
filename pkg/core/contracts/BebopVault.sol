// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';
import "./interfaces/IRoleManager.sol";

contract BebopVault is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    using Address for address payable;
    using SafeERC20 for IERC20;
    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");

    // ---  fields

    mapping(address => bool) public allowedWithdrawers;
    IRoleManager public roleManager;

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

    modifier onlyPortfolioAgent() {
        require(roleManager.hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    // --- setters

    function setVaultParams(address _roleManager) public onlyAdmin {
        require(_roleManager != address(0), 'Zero address');
        roleManager = IRoleManager(_roleManager);
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // --- contract logic

    function pause() public onlyAdmin {
        _pause();
    }

    function unpause() public onlyAdmin {
        _unpause();
    }

    function addWithdrawer(address withdrawer) external whenNotPaused onlyAdmin {
        require(withdrawer != address(0), 'Zero address');
        allowedWithdrawers[withdrawer] = true;
        emit WithdrawerAdded(withdrawer);
    }

    function removeWithdrawer(address withdrawer) external whenNotPaused onlyAdmin {
        allowedWithdrawers[withdrawer] = false;
        emit WithdrawerRemoved(withdrawer);
    }

    function depositERC20(address token, uint256 amount) external whenNotPaused {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit ERC20Deposited(token, msg.sender, amount);
    }

    function withdrawERC20(address token, address to, uint256 amount) external whenNotPaused onlyAllowedWithdrawer {
        IERC20(token).safeTransfer(to, amount);
        emit ERC20Withdrawn(token, to, amount);
    }

    function getERC20Balance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function approveERC20(address token, address spender, uint256 amount) external whenNotPaused onlyPortfolioAgent {
        require(spender != address(0), 'Invalid spender');
        require(token != address(0), 'Invalid token');

        IERC20 erc20 = IERC20(token);
        if (erc20.allowance(address(this), spender) != 0) {
            erc20.safeApprove(spender, 0);
        }
        erc20.safeApprove(spender, amount);
    }
}
