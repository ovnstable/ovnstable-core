// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./IStrategy.sol";


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


    function stake(
        address _asset, // USDC
        uint256 _amount // value for staking in USDC
    ) external override onlyPortfolioManager {
        emit Stake(_amount);
        _stake(_asset, IERC20(_asset).balanceOf(address(this)));
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary,
        bool _targetIsZero
    ) external override onlyPortfolioManager returns (uint256) {
        uint256 withdrawAmount;
        if (_targetIsZero) {
            emit Reward(_claimRewards(_beneficiary));
            withdrawAmount = _unstakeFull(_asset, _beneficiary);
        } else {
            withdrawAmount = _unstake(_asset, _amount, _beneficiary);
            require(withdrawAmount >= _amount, 'Returned value less than requested amount');
        }

        uint256 balanceUSDC = IERC20(_asset).balanceOf(address(this));
        IERC20(_asset).transfer(_beneficiary, balanceUSDC);
        emit Unstake(_amount, balanceUSDC);

        return balanceUSDC;
    }

    function claimRewards(address _to) external override onlyPortfolioManager returns (uint256) {
        uint256 totalUsdc = _claimRewards(_to);
        emit Reward(totalUsdc);
        return totalUsdc;
    }

    function healthFactorBalance() external override onlyPortfolioManager {
        uint256 healthFactor = _healthFactorBalance();
        if (healthFactor > 0) {
            emit BalanceHealthFactor(healthFactor);
        }
    }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal virtual {
        revert("Not implemented");
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal virtual returns (uint256){
        revert("Not implemented");
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal virtual returns (uint256){
        revert("Not implemented");
    }

    function _claimRewards(address _to) internal virtual returns (uint256){
        revert("Not implemented");
    }

    function _healthFactorBalance() internal virtual returns (uint256) {
        return 0;
    }

    function _convertAmount(uint256 _amount, uint256 _slippageLevel) internal returns (uint256){

        if (_amount < 10000 && _slippageLevel >= 1) {// 0.001 + 50%
            _amount += (_amount * 50) / 100;
        } else if (_amount < 100000 && _slippageLevel >= 2) {// 0.01 + 5%
            _amount += (_amount * 5) / 100;
        } else if (_amount < 1000000 && _slippageLevel >= 3) {// 0.1 + 1%
            _amount += (_amount * 1) / 100;
        } else if (_amount < 10000000 && _slippageLevel >= 4) {// 1 + 0.1%
            _amount += (_amount * 10) / 1000;
        } else if (_amount < 100000000 && _slippageLevel >= 5) {// 10 + 0.01%
            _amount += (_amount * 10) / 10000;
        } else if (_amount < 1000000000 && _slippageLevel >= 6) {// 100 + 0.001%
            _amount += (_amount * 10) / 100000;
        } else if (_amount < 10000000000 && _slippageLevel >= 7) {// 1000 + 0.001%
            _amount += (_amount * 10) / 100000;
        } else if (_amount < 100000000000 && _slippageLevel >= 8) {// 10 000 + 0.001%
            _amount += (_amount * 10) / 100000;
        } else if (_amount < 1000000000000 && _slippageLevel >= 9) {// 100 000 + 0.001%
            _amount += (_amount * 10) / 100000;
        } else if (_amount < 10000000000000 && _slippageLevel >= 10) {// 1 000 000 + 0.001%
            _amount += (_amount * 10) / 100000;
        }

        return _amount;
    }


    uint256[49] private __gap;
}
