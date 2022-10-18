// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "./interfaces/IRebaseToken.sol";

abstract contract Insurance is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {

    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");

    IRebaseToken public senior;
    IRebaseToken public junior;
    IERC20 public asset;

    uint256 public minJuniorWeight;
    uint256 public maxJuniorWeight;


    struct InsuranceParams {
        address senior;
        address junior;
        address asset;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function __Insurance_init() internal initializer {
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // 10%
        minJuniorWeight = 10;

        // 30%
        maxJuniorWeight = 30;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(hasRole(PORTFOLIO_AGENT_ROLE, msg.sender), "Restricted to Portfolio Agent");
        _;
    }

    function setParams(InsuranceParams calldata params) external onlyAdmin {
        senior = IRebaseToken(params.senior);
        junior = IRebaseToken(params.junior);
        asset = IERC20(params.asset);
    }

    function setWeights(uint256 _minJuniorWeight, uint256 _maxJuniorWeight) external onlyPortfolioAgent {
        minJuniorWeight = _minJuniorWeight;
        maxJuniorWeight = _maxJuniorWeight;
    }


    function totalSupply() public returns (uint256){
        return senior.totalSupply() + junior.totalSupply();
    }

    function mintSenior(uint256 _amount) external {
        require(_amount > 0, "Amount of asset is zero");

        uint256 currentBalance = asset.balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        uint256 seniorAmount;
        uint256 assetDecimals = IERC20Metadata(address(asset)).decimals();
        uint256 seniorDecimals = senior.decimals();

        if (assetDecimals > seniorDecimals) {
            seniorAmount = _amount / (10 ** (assetDecimals - seniorDecimals));
        } else {
            seniorAmount = _amount * (10 ** (seniorDecimals - assetDecimals));
        }

        require(seniorAmount > 0, "Amount of Senior is zero");

        asset.transferFrom(msg.sender, address(this), _amount);
        _deposit(_amount);

        senior.mint(msg.sender, seniorAmount);
    }

    function redeemSenior(uint256 _amount) external {


    }

    function maxMintJunior() public returns (uint256){
        return totalSupply() * maxJuniorWeight - junior.totalSupply();
    }

    function mintJunior(uint256 _amount) external {

    }

    function redeemJunior(uint256 _amount) external {

    }

    function maxRedeemJunior() public returns (uint256){
        return junior.totalSupply() - (totalSupply() * maxJuniorWeight);
    }

    function _deposit(
        uint256 _amount
    ) internal virtual {
        revert("Not implemented");
    }

    function _withdraw(
        uint256 _amount
    ) internal virtual {
        revert("Not implemented");
    }

    function netAssetValue() public virtual returns (uint256){
        revert("Not implemented");
    }


    function payout() public whenNotPaused {
        _payout();
    }

    function _payout() internal {


    }
}
