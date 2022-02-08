// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "../interfaces/IStrategy.sol";


abstract contract Strategy is IStrategy, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PORTFOLIO_MANAGER = keccak256("PORTFOLIO_MANAGER");

    address public portfolioManager;


    function __Strategy_init() internal initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}

    // ---  modifiers

    modifier onlyPortfolioManager() {
        require(hasRole(PORTFOLIO_MANAGER, msg.sender), "Restricted to PORTFOLIO_MANAGER");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    // --- setters

    function setPortfolioManager(address _value) public onlyAdmin {
        require(_value != address(0), "Zero address not allowed");

        revokeRole(PORTFOLIO_MANAGER, portfolioManager);
        grantRole(PORTFOLIO_MANAGER, _value);

        portfolioManager = _value;
        emit PortfolioManagerUpdated(_value);
    }


    // --- logic

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal virtual returns (uint256);


    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) public override onlyPortfolioManager returns (uint256) {
        return _unstakeProcess(_asset, _amount, _beneficiary, false);
    }

    function _unstakeProcess(
        address _asset,
        uint256 _amount,
        address _beneficiary,
        bool targetIsZero) internal returns (uint256) {

        uint256 withdrawAmount = _unstake(_asset, _amount, _beneficiary);

        if(targetIsZero){
            require(withdrawAmount >= _amount, 'Returned value less than requested amount');
            require((IERC20(_asset).balanceOf(address(this)) / 10 ** 6) >= _amount, 'BalanceOf(_asset) less than requested amount');
        }

        IERC20(_asset).transfer(_beneficiary, withdrawAmount);

        return withdrawAmount;
    }


    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary,
        bool targetIsZero
    ) public override onlyPortfolioManager returns (uint256) {
        return _unstakeProcess(_asset, _amount, _beneficiary, targetIsZero);
    }


    uint256[49] private __gap;
}
