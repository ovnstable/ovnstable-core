// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { StableMath } from "../libraries/StableMath.sol";

import "../interfaces/IPayoutManager.sol";
import "../interfaces/IRoleManager.sol";
import "../libraries/WadRayMath.sol";

/**
 * @dev Tmp impl for Arbitrum USDT+ (UsdPlusTokenV1 storage).
 *      nuke() only. USDT+ pools are intentionally left untouched.
 */
contract UsdPlusToken_ArbUsdt_Tmp is Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {

    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;
    using StableMath for uint256;

    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");

    uint256 private constant MAX_SUPPLY = type(uint256).max;
    uint256 private constant RESOLUTION_INCREASE = 1e9;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    mapping(address => uint256) private _creditBalances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    uint256 private _rebasingCredits;
    uint256 private _rebasingCreditsPerToken;

    uint256 public nonRebasingSupply;
    uint256 private DELETED_1;
    uint256 private DELETED_2;

    EnumerableSet.AddressSet private _owners;

    address public exchange;
    uint8 private _decimals;
    address public payoutManager;

    mapping(address => uint256) public nonRebasingCreditsPerToken;
    mapping(address => RebaseOptions) public rebaseState;
    EnumerableSet.AddressSet _nonRebaseOwners;

    uint256 private _status;
    bool public paused;
    IRoleManager public roleManager;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    event TotalSupplyUpdatedHighres(
        uint256 totalSupply,
        uint256 rebasingCredits,
        uint256 rebasingCreditsPerToken
    );

    enum RebaseOptions {
        OptIn,
        OptOut
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(string calldata name_, string calldata symbol_, uint8 decimals_) initializer public {
        __Context_init_unchained();
        _name = name_;
        _symbol = symbol_;

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _decimals = decimals_;
        _rebasingCreditsPerToken = WadRayMath.RAY;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Restricted to admins");
        _;
    }

    function nuke() external onlyAdmin {
        uint256 leftover = balanceOf(address(this));
        if (leftover > 0) {
            _burn(address(this), leftover);
        }

        paused = true;
        _totalSupply = 0;
        _rebasingCredits = 0;
        _rebasingCreditsPerToken = WadRayMath.RAY;
        nonRebasingSupply = 0;
        emit TotalSupplyUpdatedHighres(0, 0, WadRayMath.RAY);
    }

    function pause() public onlyAdmin { paused = true; }
    function unpause() public onlyAdmin { paused = false; }
    function isPaused() external view returns (bool) { return paused; }

    function name() public view returns (string memory) { return _name; }
    function symbol() public view returns (string memory) { return _symbol; }
    function decimals() public virtual view returns (uint8) { return _decimals; }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address _account) public view override returns (uint256) {
        return _creditBalances[_account] != 0 ? creditToAsset(_account, _creditBalances[_account]) : 0;
    }

    function assetToCredit(address owner, uint256 amount) public view returns(uint256 credit) {
        if (amount > MAX_SUPPLY / 10 ** 45) {
            return MAX_SUPPLY;
        }
        uint256 amountRay = WadRayMath.wadToRay(amount);
        uint256 creditsPerTokenRay = WadRayMath.wadToRay(_creditsPerToken(owner));
        uint256 creditRay = WadRayMath.rayMul(amountRay, creditsPerTokenRay);
        return WadRayMath.rayToWad(creditRay);
    }

    function creditToAsset(address owner, uint256 credit) public view returns(uint256 asset) {
        if (credit >= MAX_SUPPLY / 10 ** 36) {
            return MAX_SUPPLY;
        }
        uint256 creditBalancesRay = WadRayMath.wadToRay(credit);
        uint256 creditsPerTokenRay = WadRayMath.wadToRay(_creditsPerToken(owner));
        uint256 balanceOfRay = WadRayMath.rayDiv(creditBalancesRay, creditsPerTokenRay);
        return WadRayMath.rayToWad(balanceOfRay);
    }

    function _creditsPerToken(address _account) internal view returns (uint256) {
        if (nonRebasingCreditsPerToken[_account] != 0) {
            return nonRebasingCreditsPerToken[_account];
        } else {
            return _rebasingCreditsPerToken;
        }
    }

    function _isNonRebasingAccount(address _account) internal view returns (bool) {
        return rebaseState[_account] == RebaseOptions.OptOut;
    }

    function _mint(address _account, uint256 _amount) internal nonReentrant {
        require(_account != address(0), "Mint to the zero address");

        bool isNonRebasingAccount = _isNonRebasingAccount(_account);
        uint256 creditAmount = assetToCredit(_account, _amount);
        _creditBalances[_account] = _creditBalances[_account].add(creditAmount);

        if (isNonRebasingAccount) {
            nonRebasingSupply = nonRebasingSupply.add(_amount);
        } else {
            _rebasingCredits = _rebasingCredits.add(creditAmount);
        }

        _totalSupply = _totalSupply.add(_amount);
        require(_totalSupply <= MAX_SUPPLY, "Max supply");

        _owners.add(_account);

        emit Transfer(address(0), _account, _amount);
    }

    function _burn(address _account, uint256 _amount) internal nonReentrant {
        if (_amount == 0) return;

        bool isNonRebasingAccount = _isNonRebasingAccount(_account);
        uint256 creditAmount = assetToCredit(_account, _amount);
        _creditBalances[_account] = _creditBalances[_account].sub(creditAmount, "Burn exceeds balance");

        if (isNonRebasingAccount) {
            nonRebasingSupply = nonRebasingSupply.sub(_amount);
        } else {
            _rebasingCredits = _rebasingCredits.sub(creditAmount);
        }

        _totalSupply = _totalSupply.sub(_amount);

        emit Transfer(_account, address(0), _amount);
    }

    function allowance(address _owner, address _spender) public view override returns (uint256) {
        return creditToAsset(_owner, _allowances[_owner][_spender]);
    }

    function approve(address _spender, uint256 _value) public override returns (bool) {
        uint256 scaledAmount = assetToCredit(msg.sender, _value);
        _allowances[msg.sender][_spender] = scaledAmount;
        emit Approval(msg.sender, _spender, scaledAmount);
        return true;
    }

    function transfer(address _to, uint256 _value) public override returns (bool) {
        require(_to != address(0), "Transfer to zero address");
        require(_value <= balanceOf(msg.sender), "Transfer greater than balance");
        _executeTransfer(msg.sender, _to, _value);
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public override returns (bool) {
        require(_to != address(0), "Transfer to zero address");
        require(_value <= balanceOf(_from), "Transfer greater than balance");

        uint256 scaledAmount = assetToCredit(_from, _value);
        _allowances[_from][msg.sender] = _allowances[_from][msg.sender].sub(scaledAmount, "Allowance amount exceeds balance");

        _executeTransfer(_from, _to, _value);
        emit Transfer(_from, _to, _value);
        return true;
    }

    function _executeTransfer(address _from, address _to, uint256 _value) internal {
        uint256 creditsCredited = assetToCredit(_to, _value);
        uint256 creditsDeducted = assetToCredit(_from, _value);

        _creditBalances[_from] = _creditBalances[_from].sub(creditsDeducted, "Transfer amount exceeds balance");
        _creditBalances[_to] = _creditBalances[_to].add(creditsCredited);

        bool isNonRebasingTo = _isNonRebasingAccount(_to);
        bool isNonRebasingFrom = _isNonRebasingAccount(_from);
        if (isNonRebasingTo && !isNonRebasingFrom) {
            nonRebasingSupply = nonRebasingSupply.add(_value);
            _rebasingCredits = _rebasingCredits.sub(creditsDeducted);
        } else if (!isNonRebasingTo && isNonRebasingFrom) {
            nonRebasingSupply = nonRebasingSupply.sub(_value);
            _rebasingCredits = _rebasingCredits.add(creditsCredited);
        }
    }
}
