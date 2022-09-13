// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./IHedgeStrategy.sol";


abstract contract HedgeStrategy is IHedgeStrategy, Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");
    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");
    bytes32 public constant CONTROL_ROLE = keccak256("CONTROL_ROLE");
    bytes32 public constant BALANCING_BOT_ROLE = keccak256("BALANCING_BOT_ROLE");

    IERC20 public asset;
    address public exchanger;


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

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Restricted to EXCHANGER");
        _;
    }

    modifier onlyControl() {
        require(hasRole(CONTROL_ROLE, msg.sender), "Restricted to CONTROL");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    modifier onlyBalancingBot() {
        require(hasRole(BALANCING_BOT_ROLE, msg.sender), "Restricted to Balancing Bot");
        _;
    }

    // --- setters

    function setExchanger(address _value) public onlyAdmin {
        require(_value != address(0), "Zero address not allowed");

        revokeRole(EXCHANGER, exchanger);
        grantRole(EXCHANGER, _value);

        exchanger = _value;
    }

    function setAsset(address _value) internal {
        require(_value != address(0), "Zero address not allowed");
        asset = IERC20(_value);
    }


    // --- logic


    function stake(
        uint256 _amount
    ) external override onlyExchanger {
        _stake(asset.balanceOf(address(this)));
        emit Stake(_amount);
    }

    function unstake(
        uint256 _amount,
        address _to
    ) external override onlyExchanger returns (uint256) {
        uint256 withdrawAmount = _unstake(_amount);
        require(withdrawAmount >= _amount, 'Returned value less than requested amount');

        asset.transfer(_to, _amount);
        emit Unstake(_amount, withdrawAmount);

        return _amount;
    }

    function claimRewards(address _to) external override onlyExchanger returns (uint256) {
        uint256 totalUsdc = _claimRewards(_to);
        emit Reward(totalUsdc);
        return totalUsdc;
    }

    function balance() external onlyExchanger override {
        _balance();
    }

    function setHealthFactor(uint256 newHealthFactor) external onlyBalancingBot override {
        _setHealthFactor(newHealthFactor);
    }


    function _stake(
        uint256 _amount
    ) internal virtual {
        revert("Not implemented");
    }

    function _unstake(
        uint256 _amount
    ) internal virtual returns (uint256){
        revert("Not implemented");
    }

    function _claimRewards(address _to) internal virtual returns (uint256){
        revert("Not implemented");
    }

    function _balance() internal virtual returns (uint256) {
        revert("Not implemented");
    }

    function _setHealthFactor(uint256 newHealthFactor) internal virtual{
        revert("Not implemented");
    } 


    uint256[49] private __gap;
}
