// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@overnight-contracts/core/contracts/libraries/WadRayMath.sol";
import { StableMath } from "@overnight-contracts/core/contracts/libraries/StableMath.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./interfaces/Modifiers.sol";

/// @title MotivationalFund
/// @notice A smart contract that manages a motivational fund with ERC20 functionality.
/// @dev Inherits multiple OpenZeppelin contracts for security and upgradeability.
contract MotivationalFund is
    Modifiers,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC20Upgradeable,
    IERC20MetadataUpgradeable,
    UUPSUpgradeable
{
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;
    using StableMath for uint256;

    // Mapping of user addresses to their credit balances
    mapping(address => uint256) private _creditBalances;

    // Mapping of user addresses to their shares balances
    mapping(address => uint256) private _sharesBalances;

    // Mapping for allowances (ERC20 standard)
    mapping(address => mapping(address => uint256)) private _allowances;

    // Total supply of tokens
    uint256 private _totalSupply;

    // Total shares issued
    uint256 private _totalShares;

    // Set of all token owners
    EnumerableSet.AddressSet private owners;

    // Token details
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    // Variables for credit calculations
    uint256 private _rebasingCredits;
    uint256 private _rebasingCreditsPerToken;

    // Events
    event TotalSupplyUpdatedHighres(
        uint256 totalSupply,
        uint256 rebasingCredits,
        uint256 rebasingCreditsPerToken
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with a name, symbol, and decimals.
     * @param name The name of the token.
     * @param symbol The symbol of the token.
     * @param decimals The number of decimals the token uses.
     */
    function initialize(
        string calldata name,
        string calldata symbol,
        uint8 decimals
    ) public initializer {
        __Context_init_unchained();
        _name = name;
        _symbol = symbol;

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _decimals = decimals;
        _rebasingCreditsPerToken = WadRayMath.RAY; // Initial credits per token
    }

    /**
     * @notice Authorizes an upgrade to a new implementation.
     * @param newImplementation The address of the new contract implementation.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(DEFAULT_ADMIN_ROLE)
    {}

    // ============================== SETTERS =====================================

    /**
     * @notice Sets the address of the exchanger contract.
     * @param _exchanger The address of the exchanger.
     */
    

    // ============================== ERC-20 DATA =================================

    /**
     * @notice Returns the name of the token.
     */
    function name() public view override returns (string memory) {
        return _name;
    }

    /**
     * @notice Returns the symbol of the token.
     */
    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    /**
     * @notice Returns the number of decimals used to get its user representation.
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Returns the total token supply.
     */
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @notice Returns the balance of a specific address.
     * @param _account The address to query the balance of.
     */
    function balanceOf(address _account) public view override returns (uint256) {
        return
            _creditBalances[_account] != 0
                ? creditToAsset(_creditBalances[_account])
                : 0;
    }

    /**
     * @notice Returns the number of token owners.
     */
    function ownersLength() public view returns (uint256) {
        return owners.length();
    }

    /**
     * @notice Returns the high-resolution rebasing credits per token.
     */
    function rebasingCreditsPerToken() public view returns (uint256) {
        return _rebasingCreditsPerToken;
    }

    /**
     * @notice Returns the total number of rebasing credits.
     */
    function rebasingCredits() public view returns (uint256) {
        return _rebasingCredits;
    }

    /**
     * @notice Returns the total shares of the fund.
     */
    function totalShares() external view returns (uint256) {
        return _totalShares;
    }

    /**
     * @notice Returns the shares balance of a specific address.
     * @param _account The address to query the shares balance of.
     */
    function sharesBalanceOf(address _account)
        external
        view
        returns (uint256)
    {
        return _sharesBalances[_account];
    }

    /**
     * @notice Returns the credit balance and credits per token of an address.
     * @param _account The address to query.
     */
    function creditsBalanceOf(address _account)
        public
        view
        returns (uint256, uint256)
    {
        uint256 cpt = _creditsPerToken();
        return (_creditBalances[_account], cpt);
    }

    /**
     * @notice Transfers tokens to a specified address.
     * @param _to The address to transfer to.
     * @param _value The amount to be transferred.
     */
    function transfer(address _to, uint256 _value)
        public
        override
        whenNotPaused
        returns (bool)
    {
        require(_to != address(0), "Transfer to zero address");
        require(
            _value <= balanceOf(msg.sender),
            "Transfer amount exceeds balance"
        );

        _executeTransfer(msg.sender, _to, _value);

        emit Transfer(msg.sender, _to, _value);

        return true;
    }

    /**
     * @notice Converts asset amount to credits.
     * @param amount The amount in tokens.
     */
    function assetToCredit(uint256 amount)
        public
        view
        returns (uint256 credit)
    {
        if (amount > MAX_SUPPLY / 10 ** 45) {
            return MAX_SUPPLY;
        }
        uint256 amountRay = WadRayMath.wadToRay(amount);
        uint256 creditsPerTokenRay = WadRayMath.wadToRay(
            _rebasingCreditsPerToken
        );
        uint256 creditRay = WadRayMath.rayMul(amountRay, creditsPerTokenRay);
        return WadRayMath.rayToWad(creditRay);
    }

    /**
     * @notice Converts credits to asset amount.
     * @param credit The amount in credits.
     */
    function creditToAsset(uint256 credit)
        public
        view
        returns (uint256 asset)
    {
        if (credit >= MAX_SUPPLY / 10 ** 36) {
            return MAX_SUPPLY;
        }
        uint256 creditBalancesRay = WadRayMath.wadToRay(credit);
        uint256 creditsPerTokenRay = WadRayMath.wadToRay(
            _rebasingCreditsPerToken
        );
        uint256 balanceOfRay = WadRayMath.rayDiv(
            creditBalancesRay,
            creditsPerTokenRay
        );
        return WadRayMath.rayToWad(balanceOfRay);
    }

    /**
     * @notice Subtracts credits with consideration for rounding errors.
     * @param credit1 The minuend in credits.
     * @param credit2 The subtrahend in credits.
     * @param errorText The error message if subtraction fails.
     */
    function subCredits(
        uint256 credit1,
        uint256 credit2,
        string memory errorText
    ) public view returns (uint256 resultCredit) {
        uint256 amount1 = creditToAsset(credit1);
        uint256 amount2 = creditToAsset(credit2);
        if (amount1 == MAX_SUPPLY || amount1 + 1 >= amount2) {
            return credit1 >= credit2 ? credit1 - credit2 : 0;
        } else {
            revert(errorText);
        }
    }

    /**
     * @notice Transfers shares to another address.
     * @param _account The recipient address.
     * @param _amount The amount of shares to transfer.
     */
    function transferShares(address _account, uint256 _amount) public {
        require(_account != address(0), "Transfer to zero address");
        require(
            _sharesBalances[msg.sender] >= _amount,
            "Transfer amount exceeds balance"
        );

        _sharesBalances[_account] += _amount;
        _sharesBalances[msg.sender] -= _amount;

        _afterTokenTransfer(address(0), _account, _amount);
    }

    /**
     * @notice Transfers tokens from one address to another.
     * @param _from The address to send tokens from.
     * @param _to The address to transfer to.
     * @param _value The amount of tokens to be transferred.
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public override whenNotPaused returns (bool) {
        require(_to != address(0), "Transfer to zero address");
        require(_value <= balanceOf(_from), "Transfer amount exceeds balance");

        uint256 scaledAmount = assetToCredit(_value);

        _allowances[_from][msg.sender] = subCredits(
            _allowances[_from][msg.sender],
            scaledAmount,
            "Allowance amount exceeds balance"
        );

        _executeTransfer(_from, _to, _value);

        emit Transfer(_from, _to, _value);

        return true;
    }

    /**
     * @notice Executes the token transfer between two addresses.
     * @param _from The sender address.
     * @param _to The recipient address.
     * @param _value The amount to transfer.
     */
    function _executeTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal {
        uint256 credits = assetToCredit(_value);

        _creditBalances[_from] = subCredits(
            _creditBalances[_from],
            credits,
            "Transfer amount exceeds balance"
        );
        _creditBalances[_to] = _creditBalances[_to].add(credits);

        _afterTokenTransfer(address(0), _to, _value);
    }

    /**
     * @notice Returns the amount of tokens that an owner allowed to a spender.
     * @param _owner The owner address.
     * @param _spender The spender address.
     */
    function allowance(address _owner, address _spender)
        public
        view
        override
        returns (uint256)
    {
        uint256 currentAllowance = _allowances[_owner][_spender];
        return creditToAsset(currentAllowance);
    }

    /**
     * @notice Approves a spender to spend a specific amount of tokens.
     * @param _spender The spender address.
     * @param _value The amount to approve.
     */
    function approve(address _spender, uint256 _value)
        public
        override
        whenNotPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(_value);
        _allowances[msg.sender][_spender] = scaledAmount;
        // emit Approval(msg.sender, _spender, scaledAmount);
        return true;
    }

    /**
     * @notice Increases the allowance granted to a spender.
     * @param _spender The spender address.
     * @param _addedValue The additional amount to approve.
     */
    function increaseAllowance(address _spender, uint256 _addedValue)
        public
        whenNotPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(_addedValue);
        _allowances[msg.sender][_spender] = _allowances[msg.sender][_spender]
            .add(scaledAmount);
        emit Approval(
            msg.sender,
            _spender,
            _allowances[msg.sender][_spender]
        );
        return true;
    }

    /**
     * @notice Decreases the allowance granted to a spender.
     * @param _spender The spender address.
     * @param _subtractedValue The amount to decrease.
     */
    function decreaseAllowance(address _spender, uint256 _subtractedValue)
        public
        whenNotPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(_subtractedValue);
        _allowances[msg.sender][_spender] = (_allowances[msg.sender][_spender] >=
            scaledAmount)
            ? _allowances[msg.sender][_spender] - scaledAmount
            : 0;
        emit Approval(
            msg.sender,
            _spender,
            _allowances[msg.sender][_spender]
        );
        return true;
    }

    // ============================== MINT & BURN =================================

    /**
     * @notice Mints new tokens to a specified address.
     * @param _account The recipient address.
     * @param _amount The amount to mint.
     */
    function mint(address _account, uint256 _amount) 
        external 
        whenNotPaused 
        onlyExchanger 
        nonReentrant 
    {
        _mint(_account, _amount);
    }

    /**
     * @notice Internal function to mint tokens.
     * @param _account The recipient address.
     * @param _amount The amount to mint.
     */
    function _mint(address _account, uint256 _amount) internal {
        require(_account != address(0), "Mint to the zero address");

        uint256 creditAmount = assetToCredit(_amount);
        _creditBalances[_account] = _creditBalances[_account].add(creditAmount);

        _rebasingCredits = _rebasingCredits.add(creditAmount);

        _totalSupply = _totalSupply.add(_amount);

        require(_totalSupply <= MAX_SUPPLY, "Exceeds max supply");

        _afterTokenTransfer(address(0), _account, _amount);

        emit Transfer(address(0), _account, _amount);
    }

    /**
     * @notice Assigns shares to an address.
     * @param _account The recipient address.
     * @param _amount The amount of shares.
     */
    function giveShares(address _account, uint256 _amount) 
        external 
        whenNotPaused 
        onlyDepositor 
    {
        require(_account != address(0), "Mint to the zero address");

        _sharesBalances[_account] += _amount;

        _totalShares = _totalShares.add(_amount);

        _afterTokenTransfer(address(0), _account, _amount);

        emit Transfer(address(0), _account, _amount);
    }

    /**
     * @notice Burns shares from an address.
     * @param _account The address to burn shares from.
     * @param _amount The amount of shares to burn.
     */
    function burnShares(address _account, uint256 _amount) 
        external 
        whenNotPaused 
        onlyDepositor 
    {
        require(_account != address(0), "Burn from zero address");
        require(_sharesBalances[_account] >= _amount, "Account does not have enough shares");

        _totalShares -= _amount;

        _sharesBalances[_account] -= _amount;
    }

    /**
     * @notice Burns tokens from a specified address.
     * @param account The address to burn from.
     * @param amount The amount to burn.
     */
    function burn(
        address account,
        uint256 amount
    ) external whenNotPaused onlyExchanger {
        _burn(account, amount);
    }

    /**
     * @notice Internal function to burn tokens.
     * @param _account The address to burn from.
     * @param _amount The amount to burn.
     */
    function _burn(address _account, uint256 _amount) internal nonReentrant {
        require(_account != address(0), "Burn from the zero address");
        require(
            _amount <= balanceOf(_account),
            "Burn amount exceeds balance"
        );
        if (_amount == 0) {
            emit Transfer(_account, address(0), _amount);
            return;
        }

        uint256 creditAmount = assetToCredit(_amount);
        _creditBalances[_account] = subCredits(
            _creditBalances[_account],
            creditAmount,
            "Burn amount exceeds balance"
        );

        _rebasingCredits = _rebasingCredits.sub(creditAmount);

        _totalSupply = _totalSupply.sub(_amount);

        _afterTokenTransfer(_account, address(0), _amount);

        emit Transfer(_account, address(0), _amount);
    }

    // ============================== SUPPLY MANAGEMENT ===========================

    /**
     * @notice Returns the credits per token for an account.
     */
    function _creditsPerToken() internal view returns (uint256) {
        return _rebasingCreditsPerToken;
    }

    /**
     * @notice Adjusts the total supply negatively.
     * @param _newTotalSupply The new total supply after adjustment.
     */
    function changeNegativeSupply(uint256 _newTotalSupply)
        external
        onlyExchanger
    {
        _rebasingCreditsPerToken = _rebasingCredits.divPrecisely(
            _newTotalSupply
        );
        _totalSupply = _rebasingCredits.divPrecisely(_rebasingCreditsPerToken);
    }

    /**
     * @notice Changes the supply without minting new tokens for regular FUND holders.
     * @param _newTotalSupply The new total supply of tokens.
     * @param _totalDeposit The total deposit amount.
     */
    function changeSupply(uint256 _newTotalSupply, uint256 _totalDeposit) 
        external 
        onlyExchanger 
        nonReentrant 
        whenNotPaused 
    {
        require(_totalSupply > 0, "Cannot increase zero supply");
        require(
            _newTotalSupply >= _totalSupply + _totalDeposit,
            "Negative rebase not allowed"
        );

        if (_totalSupply == _newTotalSupply) {
            emit TotalSupplyUpdatedHighres(
                _totalSupply,
                _rebasingCredits,
                _rebasingCreditsPerToken
            );
            return;
        }

        uint256 delta = _newTotalSupply - _totalSupply - _totalDeposit;

        uint256 baseDelta = (delta * _totalDeposit) / (_totalSupply + _totalDeposit);

        uint256 teamDelta = delta - baseDelta;

        uint256 ownersCount = ownersLength();

        _totalSupply = _totalSupply + teamDelta > MAX_SUPPLY
            ? MAX_SUPPLY
            : _totalSupply + teamDelta;

        _rebasingCreditsPerToken = _rebasingCredits.divPrecisely(_totalSupply);

        if (_totalShares > 0) {
            for (uint256 i = 0; i < ownersCount - 1; i++) {
                address curOwner = owners.at(i);
                if (_sharesBalances[curOwner] != 0) {
                    _mint(
                        curOwner,
                        (_sharesBalances[curOwner] * baseDelta) / _totalShares
                    );
                }
            }
        }

        uint256 precisionDelta = _newTotalSupply - _totalSupply - _totalDeposit;    
        _mint(owners.at(ownersCount - 1), precisionDelta);        

        require(_rebasingCreditsPerToken > 0, "Invalid change in supply");

        emit TotalSupplyUpdatedHighres(
            _totalSupply,
            _rebasingCredits,
            _rebasingCreditsPerToken
        );
    }

    /**
     * @notice Hook that is called after any transfer of tokens.
     * @param from The address tokens are transferred from.
     * @param to The address tokens are transferred to.
     * @param amount The amount of tokens transferred.
     */
    function _afterTokenTransfer(address from, address to, uint256 amount) internal {
        if (from == to) {
            return;
        }

        if (from == address(0)) {
            // Mint
            owners.add(to);
        } else if (to == address(0)) {
            // Burn
            if (balanceOf(from) == 0 && _sharesBalances[from] == 0) {
                owners.remove(from);
            }
        } else {
            // Transfer
            if (balanceOf(from) == 0 && _sharesBalances[from] == 0) {
                owners.remove(from);
            } else if (amount > 0) {
                owners.add(to);
            }
            if (amount > 0) {
                owners.add(to);
            }
        }
    }
}
