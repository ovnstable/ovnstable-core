// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { EnumerableSet } from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { IERC20Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import { IERC20MetadataUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { PausableUpgradeable, ContextUpgradeable } from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import { NonRebaseInfo } from "./interfaces/IPayoutManager.sol";
import { IRoleManager } from "./interfaces/IRoleManager.sol";
// import { IRemoteHub, IExchange } from "./interfaces/IRemoteHub.sol";
import { WadRayMath } from "./libraries/WadRayMath.sol";

// Because of upgradeable cannot use ReentrancyGuard (nonReentrant modifier)
// Because of upgradeable cannot use PausableUpgradeable (whenNotPaused modifier)

contract XusdToken is
    Initializable,
    ContextUpgradeable,
    IERC20Upgradeable,
    IERC20MetadataUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 private constant MAX_SUPPLY = type(uint256).max;
    uint256 private constant RESOLUTION_INCREASE = 1e9;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    enum RebaseOptions {
        OptIn,
        OptOut
    }

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

    EnumerableSet.AddressSet private DELETED_3;

    address private DELETED_4;

    uint8 private _decimals;

    IRemoteHub public remoteHub;

    mapping(address => uint256) public nonRebasingCreditsPerToken;
    mapping(address => RebaseOptions) public rebaseState;
    EnumerableSet.AddressSet _nonRebaseOwners;
    uint256 private _reentrancyGuardStatus;
    bool public paused;

    // ---  events

    event RemoteHubUpdated(address remoteHub);

    event TotalSupplyUpdatedHighres(uint256 totalSupply, uint256 rebasingCredits, uint256 rebasingCreditsPerToken);
    event Paused();
    event Unpaused();
    error ErrorInSubCredits(string error);

    // ---  initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function UPGRADER_ROLE() public pure returns (bytes32) {
        return keccak256("UPGRADER_ROLE");
    }

    /// @notice Initializes the contract
    /// @param __name The name of the token
    /// @param __symbol The symbol of the token
    /// @param __decimals The number of decimals for the token
    /// @param __remoteHub The address of the remote hub
    function initialize(
        string calldata __name,
        string calldata __symbol,
        uint8 __decimals,
        address __remoteHub
    ) public initializer {
        __Context_init_unchained();
        _name = __name;
        _symbol = __symbol;

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE(), msg.sender);

        _decimals = __decimals;
        _rebasingCreditsPerToken = WadRayMath.RAY;
        remoteHub = IRemoteHub(__remoteHub);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyUpgrader {}

    // ---  remoteHub getters

    function roleManager() internal view returns (IRoleManager) {
        return remoteHub.roleManager();
    }

    function exchange() internal view returns (IExchange) {
        return remoteHub.exchange();
    }

    // ---  modifiers

    modifier nonReentrant() {
        require(_reentrancyGuardStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyGuardStatus = _ENTERED;
        _;
        _reentrancyGuardStatus = _NOT_ENTERED;
    }

    modifier whenNotPaused() {
        require(!paused, "pause");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(
            roleManager().hasRole(roleManager().PORTFOLIO_AGENT_ROLE(), msg.sender),
            "Caller doesn't have PORTFOLIO_AGENT_ROLE role"
        );
        _;
    }

    modifier onlyExchanger() {
        require(address(exchange()) == msg.sender, "Caller is not the EXCHANGER");
        _;
    }

    modifier onlyExchangerOrWrapper() {
        require(address(exchange()) == msg.sender || address(remoteHub.wxusd()) == msg.sender, "Caller is not the EXCHANGER or WRAPPER");
        _;
    }

    modifier onlyPayoutManager() {
        require(address(remoteHub.payoutManager()) == msg.sender, "Caller is not the PAYOUT_MANAGER");
        _;
    }

    modifier onlyUpgrader() {
        require(hasRole(UPGRADER_ROLE(), msg.sender), "Caller doesn't have UPGRADER_ROLE role");
        _;
    }

    // --- setters

    function setRemoteHub(address _remoteHub) external onlyUpgrader {
        require(_remoteHub != address(0), "Zero address not allowed");
        remoteHub = IRemoteHub(_remoteHub);
        emit RemoteHubUpdated(_remoteHub);
    }

    // ---  logic

    function pause() public onlyPortfolioAgent {
        paused = true;
        emit Paused();
    }

    function unpause() public onlyPortfolioAgent {
        paused = false;
        emit Unpaused();
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return _decimals;
    }

    function nonRebaseOwnersLength() external view returns (uint256) {
        return _nonRebaseOwners.length();
    }

    /**
     * @return The total supply of xUSD.
     */
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @return Low resolution rebasingCreditsPerToken
     */
    function rebasingCreditsPerToken() public view returns (uint256) {
        return _rebasingCreditsPerToken / RESOLUTION_INCREASE;
    }

    /**
     * @return Low resolution total number of rebasing credits
     */
    function rebasingCredits() public view returns (uint256) {
        return _rebasingCredits / RESOLUTION_INCREASE;
    }

    /**
     * @return High resolution rebasingCreditsPerToken
     */
    function rebasingCreditsPerTokenHighres() public view returns (uint256) {
        return _rebasingCreditsPerToken;
    }

    /**
     * @return High resolution total number of rebasing credits
     */
    function rebasingCreditsHighres() public view returns (uint256) {
        return _rebasingCredits;
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param _account Address to query the balance of.
     * @return A uint256 representing the amount of base units owned by the
     *         specified address.
     */
    function balanceOf(address _account) public view override returns (uint256) {
        return _creditBalances[_account] != 0 ? creditToAsset(_account, _creditBalances[_account]) : 0;
    }

    /**
     * @dev Gets the credits balance of the specified address.
     * @dev Backwards compatible with old low res credits per token.
     * @param _account The address to query the balance of.
     * @return (uint256, uint256) Credit balance and credits per token of the
     *         address
     */
    function creditsBalanceOf(address _account) public view returns (uint256, uint256) {
        uint256 cpt = _creditsPerToken(_account);
        if (cpt == 1e27) {
            // For a period before the resolution upgrade, we created all new
            // contract accounts at high resolution. Since they are not changing
            // as a result of this upgrade, we will return their true values
            return (_creditBalances[_account], cpt);
        } else {
            return (_creditBalances[_account] / RESOLUTION_INCREASE, cpt / RESOLUTION_INCREASE);
        }
    }

    /**
     * @dev Gets the credits balance of the specified address.
     * @param _account The address to query the balance of.
     * @return (uint256, uint256) Credit balance, credits per token of the address
     */
    function creditsBalanceOfHighres(address _account) public view returns (uint256, uint256) {
        return (_creditBalances[_account], _creditsPerToken(_account));
    }

    /**
     * @notice Transfers tokens to a specified address
     * @param _to The address to transfer to
     * @param _value The amount to be transferred
     * @return bool true on success
     */
    function transfer(address _to, uint256 _value) public override whenNotPaused returns (bool) {
        require(_to != address(0), "Transfer to zero address");
        require(_value <= balanceOf(msg.sender), "Transfer greater than balance");

        _executeTransfer(msg.sender, _to, _value);

        emit Transfer(msg.sender, _to, _value);

        return true;
    }

    /**
     * @notice Converts xUSD balance value to credits
     * @param owner The address which owns the funds
     * @param amount The amount for conversion in xUSD
     * @return credit The number of tokens in credits
     */
    function assetToCredit(address owner, uint256 amount) public view returns (uint256 credit) {
        if (amount > MAX_SUPPLY / 10 ** 45) {
            return MAX_SUPPLY;
        }
        uint256 amountRay = WadRayMath.wadToRay(amount);
        uint256 creditsPerTokenRay = WadRayMath.wadToRay(_creditsPerToken(owner));
        uint256 creditRay = WadRayMath.rayMul(amountRay, creditsPerTokenRay);
        return WadRayMath.rayToWad(creditRay);
    }

    /**
     * @notice Converts credits balance value to xUSD
     * @param owner The address which owns the funds
     * @param credit The amount for conversion in credits
     * @return asset The number of tokens in xUSD
     */
    function creditToAsset(address owner, uint256 credit) public view returns (uint256 asset) {
        if (credit >= MAX_SUPPLY / 10 ** 36) {
            return MAX_SUPPLY;
        }
        uint256 creditBalancesRay = WadRayMath.wadToRay(credit);
        uint256 creditsPerTokenRay = WadRayMath.wadToRay(_creditsPerToken(owner));
        uint256 balanceOfRay = WadRayMath.rayDiv(creditBalancesRay, creditsPerTokenRay);
        return WadRayMath.rayToWad(balanceOfRay);
    }

    /**
     * @notice Subtracts credits with increased accuracy
     * @param owner The address which owns the funds
     * @param credit1 The minuend number in credits (increased accuracy)
     * @param credit2 The subtrahend number in credits (increased accuracy)
     * @param errorText Text for error if the subtrahend is much greater than the minuend
     * @return resultCredit The resulting number of tokens in credits
     */
    function subCredits(
        address owner,
        uint256 credit1,
        uint256 credit2,
        string memory errorText
    ) public view returns (uint256 resultCredit) {
        uint256 amount1 = creditToAsset(owner, credit1);
        uint256 amount2 = creditToAsset(owner, credit2);
        if (amount1 == MAX_SUPPLY || amount1 + 1 >= amount2) {
            return credit1 >= credit2 ? credit1 - credit2 : 0;
        } else {
            revert ErrorInSubCredits(errorText);
        }
    }

    /**
     * @notice Transfer tokens from one address to another
     * @param _from The address to transfer from
     * @param _to The address to transfer to
     * @param _value The amount of tokens to be transferred
     * @return bool true on success
     */
    function transferFrom(address _from, address _to, uint256 _value) public override whenNotPaused returns (bool) {
        require(_to != address(0), "Transfer to zero address");
        require(_value <= balanceOf(_from), "Transfer greater than balance");

        uint256 scaledAmount = assetToCredit(_from, _value);

        _allowances[_from][msg.sender] = subCredits(
            _from,
            _allowances[_from][msg.sender],
            scaledAmount,
            "Allowance amount exceeds balance"
        );

        _executeTransfer(_from, _to, _value);

        emit Transfer(_from, _to, _value);

        return true;
    }

    /**
     * @dev Update the count of non rebasing credits in response to a transfer
     * @param _from The address you want to send tokens from.
     * @param _to The address you want to transfer to.
     * @param _value Amount of xUSD to transfer
     */
    function _executeTransfer(address _from, address _to, uint256 _value) internal {
        _beforeTokenTransfer(_from, _to, _value);

        bool isNonRebasingTo = _isNonRebasingAccount(_to);
        bool isNonRebasingFrom = _isNonRebasingAccount(_from);

        // Credits deducted and credited might be different due to the
        // differing creditsPerToken used by each account
        uint256 creditsCredited = assetToCredit(_to, _value);
        uint256 creditsDeducted = assetToCredit(_from, _value);

        _creditBalances[_from] = subCredits(_from, _creditBalances[_from], creditsDeducted, "Transfer amount exceeds balance");
        _creditBalances[_to] = _creditBalances[_to] + creditsCredited;

        if (isNonRebasingTo && !isNonRebasingFrom) {
            // Transfer to non-rebasing account from rebasing account, credits
            // are removed from the non rebasing tally
            nonRebasingSupply = nonRebasingSupply + _value;
            // Update rebasingCredits by subtracting the deducted amount
            _rebasingCredits = _rebasingCredits - creditsDeducted;
        } else if (!isNonRebasingTo && isNonRebasingFrom) {
            // Transfer to rebasing account from non-rebasing account
            // Decreasing non-rebasing credits by the amount that was sent
            nonRebasingSupply = nonRebasingSupply - _value;
            // Update rebasingCredits by adding the credited amount
            _rebasingCredits = _rebasingCredits + creditsCredited;
        }

        _afterTokenTransfer(_from, _to, _value);
    }

    /**
     * @dev Function to check the amount of tokens that _owner has allowed to
     *      `_spender`.
     * @param _owner The address which owns the funds.
     * @param _spender The address which will spend the funds.
     * @return The number of tokens still available for the _spender.
     */
    function allowance(address _owner, address _spender) public view override returns (uint256) {
        uint256 currentAllowance = _allowances[_owner][_spender];

        return creditToAsset(_owner, currentAllowance);
    }

    /**
     * @notice Approve the passed address to spend the specified amount of tokens on behalf of msg.sender
     * @param _spender The address which will spend the funds
     * @param _value The amount of tokens to be spent
     * @return bool true on success
     */
    function approve(address _spender, uint256 _value) public override whenNotPaused returns (bool) {
        uint256 scaledAmount = assetToCredit(msg.sender, _value);
        _allowances[msg.sender][_spender] = scaledAmount;
        emit Approval(msg.sender, _spender, scaledAmount);
        return true;
    }

    /**
     * @notice Increase the amount of tokens that an owner has allowed to a spender
     * @param _spender The address which will spend the funds
     * @param _addedValue The amount of tokens to increase the allowance by
     * @return bool true on success
     */
    function increaseAllowance(address _spender, uint256 _addedValue) public whenNotPaused returns (bool) {
        uint256 scaledAmount = assetToCredit(msg.sender, _addedValue);
        _allowances[msg.sender][_spender] = _allowances[msg.sender][_spender] + scaledAmount;
        emit Approval(msg.sender, _spender, _allowances[msg.sender][_spender]);
        return true;
    }

    /**
     * @notice Decrease the amount of tokens that an owner has allowed to a spender
     * @param _spender The address which will spend the funds
     * @param _subtractedValue The amount of tokens to decrease the allowance by
     * @return bool true on success
     */
    function decreaseAllowance(address _spender, uint256 _subtractedValue) public whenNotPaused returns (bool) {
        uint256 scaledAmount = assetToCredit(msg.sender, _subtractedValue);
        _allowances[msg.sender][_spender] = (_allowances[msg.sender][_spender] >= scaledAmount)
            ? _allowances[msg.sender][_spender] - scaledAmount
            : 0;
        emit Approval(msg.sender, _spender, _allowances[msg.sender][_spender]);
        return true;
    }

    /**
     * @notice Mints new tokens, increasing totalSupply
     * @param _account The address that will receive the minted tokens
     * @param _amount The amount of tokens to mint
     */
    function mint(address _account, uint256 _amount) external whenNotPaused onlyExchangerOrWrapper {
        _mint(_account, _amount);
    }

    /**
     * @dev Creates `_amount` tokens and assigns them to `_account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address _account, uint256 _amount) internal nonReentrant {
        require(_account != address(0), "Mint to the zero address");

        _beforeTokenTransfer(address(0), _account, _amount);

        bool isNonRebasingAccount = _isNonRebasingAccount(_account);

        uint256 creditAmount = assetToCredit(_account, _amount);
        _creditBalances[_account] = _creditBalances[_account] + creditAmount;

        // If the account is non rebasing and doesn't have a set creditsPerToken
        // then set it i.e. this is a mint from a fresh contract
        if (isNonRebasingAccount) {
            nonRebasingSupply = nonRebasingSupply + _amount;
        } else {
            _rebasingCredits = _rebasingCredits + creditAmount;
        }

        _totalSupply = _totalSupply + _amount;

        require(_totalSupply <= MAX_SUPPLY, "Max supply");

        _afterTokenTransfer(address(0), _account, _amount);

        emit Transfer(address(0), _account, _amount);
    }

    /**
     * @notice Burns tokens, decreasing totalSupply
     * @param account The address from which to burn tokens
     * @param amount The amount of tokens to burn
     */
    function burn(address account, uint256 amount) external whenNotPaused onlyExchangerOrWrapper {
        _burn(account, amount);
    }

    /**
     * @dev Destroys `_amount` tokens from `_account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements
     *
     * - `_account` cannot be the zero address.
     * - `_account` must have at least `_amount` tokens.
     */
    function _burn(address _account, uint256 _amount) internal nonReentrant {
        require(_account != address(0), "Burn from the zero address");
        if (_amount == 0) {
            emit Transfer(_account, address(0), _amount);
            return;
        }

        _beforeTokenTransfer(_account, address(0), _amount);

        bool isNonRebasingAccount = _isNonRebasingAccount(_account);
        uint256 creditAmount = assetToCredit(_account, _amount);
        _creditBalances[_account] = subCredits(_account, _creditBalances[_account], creditAmount, "Burn amount exceeds balance");

        // Remove from the credit tallies and non-rebasing supply
        if (isNonRebasingAccount) {
            nonRebasingSupply = nonRebasingSupply - _amount;
        } else {
            _rebasingCredits = _rebasingCredits - creditAmount;
        }

        _totalSupply = _totalSupply - _amount;

        _afterTokenTransfer(_account, address(0), _amount);

        emit Transfer(_account, address(0), _amount);
    }

    /**
     * @dev Get the credits per token for an account. Returns a fixed amount
     *      if the account is non-rebasing.
     * @param _account Address of the account.
     */
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

    /**
     * @notice Add a contract address to the non-rebasing exception list
     * @param _address The address to opt in for rebasing
     */
    function rebaseOptIn(address _address) public onlyPayoutManager whenNotPaused nonReentrant {
        require(_isNonRebasingAccount(_address), "Account has not opted out");

        // Convert balance into the same amount at the current exchange rate
        uint256 newCreditBalance = (_creditBalances[_address] * _rebasingCreditsPerToken) / _creditsPerToken(_address);

        // Decreasing non rebasing supply
        nonRebasingSupply = nonRebasingSupply - balanceOf(_address);

        _creditBalances[_address] = newCreditBalance;

        // Increase rebasing credits, totalSupply remains unchanged so no
        // adjustment necessary
        _rebasingCredits = _rebasingCredits + newCreditBalance;

        rebaseState[_address] = RebaseOptions.OptIn;

        // Delete any fixed credits per token
        delete nonRebasingCreditsPerToken[_address];

        _nonRebaseOwners.remove(_address);
    }

    /**
     * @notice Explicitly mark that an address is non-rebasing
     * @param _address The address to opt out of rebasing
     */
    function rebaseOptOut(address _address) public onlyPayoutManager whenNotPaused nonReentrant {
        require(!_isNonRebasingAccount(_address), "Account has not opted in");

        // Increase non rebasing supply
        nonRebasingSupply = nonRebasingSupply + balanceOf(_address);
        // Set fixed credits per token
        nonRebasingCreditsPerToken[_address] = _rebasingCreditsPerToken;

        // Decrease rebasing credits, total supply remains unchanged so no
        // adjustment necessary
        _rebasingCredits = _rebasingCredits - _creditBalances[_address];

        // Mark explicitly opted out of rebasing
        rebaseState[_address] = RebaseOptions.OptOut;

        _nonRebaseOwners.add(_address);
    }

    /**
     * @notice Modify the supply without minting new tokens
     * @param _newTotalSupply New total supply of xUSD
     * @return NonRebaseInfo[] Array of non-rebasing account information
     * @return uint256 Total amount of non-rebasing delta
     */
    function changeSupply(
        uint256 _newTotalSupply
    ) external onlyExchanger nonReentrant whenNotPaused returns (NonRebaseInfo[] memory, uint256) {
        require(_totalSupply > 0, "Cannot increase 0 supply");
        require(_newTotalSupply >= _totalSupply, "negative rebase");

        if (_totalSupply == _newTotalSupply) {
            emit TotalSupplyUpdatedHighres(_totalSupply, _rebasingCredits, _rebasingCreditsPerToken);
            return (new NonRebaseInfo[](0), 0);
        }

        uint256 delta = _newTotalSupply - _totalSupply;
        uint256 deltaNR = (delta * nonRebasingSupply) / _totalSupply;
        uint256 deltaR = delta - deltaNR;

        _totalSupply = _totalSupply + deltaR > MAX_SUPPLY ? MAX_SUPPLY : _totalSupply + deltaR;

        if (_totalSupply - nonRebasingSupply != 0) {
            _rebasingCreditsPerToken = (_rebasingCredits * 1e18) / (_totalSupply - nonRebasingSupply);
        }

        require(_rebasingCreditsPerToken > 0, "Invalid change in supply");

        _totalSupply = (_rebasingCredits * 1e18) / _rebasingCreditsPerToken + nonRebasingSupply;

        NonRebaseInfo[] memory nonRebaseInfo = new NonRebaseInfo[](_nonRebaseOwners.length());
        for (uint256 i = 0; i < nonRebaseInfo.length; ++i) {
            address userAddress = _nonRebaseOwners.at(i);
            uint256 userBalance = balanceOf(userAddress);
            uint256 userPart = (nonRebasingSupply != 0) ? (userBalance * deltaNR) / nonRebasingSupply : 0;
            nonRebaseInfo[i].pool = userAddress;
            nonRebaseInfo[i].amount = userPart;
        }

        emit TotalSupplyUpdatedHighres(_totalSupply, _rebasingCredits, _rebasingCreditsPerToken);

        return (nonRebaseInfo, deltaNR);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal {}

    function _afterTokenTransfer(address from, address to, uint256 amount) internal {}

    // ---  for deploy
    // delete after deploy

    function initialize_v2(uint256 value) public reinitializer(2) onlyPortfolioAgent {
        if (value != 0) {
            _rebasingCreditsPerToken = value;
        }
        _name = "xUSD";
        _symbol = "xUSD";
    }

    // function changeTotalSupply(uint256 value) public onlyPortfolioAgent {
    //     if (value != 0) {
    //         _rebasingCreditsPerToken = value;
    //     }
    // }
}