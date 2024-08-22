// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { StableMath } from "./libraries/StableMath.sol";

import "./interfaces/IPayoutManager.sol";
import "./interfaces/IRoleManager.sol";
import "./libraries/WadRayMath.sol";


contract UsdPlusToken is Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {

    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;
    using StableMath for uint256;

    bytes32 public constant PORTFOLIO_AGENT_ROLE = keccak256("PORTFOLIO_AGENT_ROLE");

    uint256 private constant MAX_SUPPLY = type(uint256).max;
    uint256 private constant RESOLUTION_INCREASE = 1e9;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    mapping(address => uint256) private _creditBalances;
    mapping(address => uint256) private _sharesBalances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    uint256 private _totalShares;

    EnumerableSet.AddressSet owners;

    string private _name;
    string private _symbol;

    uint256 private _rebasingCredits;
    uint256 private _rebasingCreditsPerToken;


    uint256 public nonRebasingSupply;

    address public exchange;
    uint8 private _decimals;
    address public payoutManager;

    uint256 private _status; // ReentrancyGuard
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

    event ExchangerUpdated(address exchanger);
    event PayoutManagerUpdated(address payoutManager);
    event RoleManagerUpdated(address roleManager);


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }


    function initialize(string calldata name, string calldata symbol, uint8 decimals) initializer public {
        __Context_init_unchained();
        _name = name;
        _symbol = symbol;

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _decimals = decimals;
        _rebasingCreditsPerToken = WadRayMath.RAY;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}

    /**
     * @dev Verifies that the caller is the Exchanger contract
     */
    modifier onlyExchanger() {
        require(exchange == _msgSender(), "Caller is not the EXCHANGER");
        _;
    }

    modifier onlyPayoutManager() {
        require(payoutManager == _msgSender(), "Caller is not the PAYOUT_MANAGER");
        _;
    }

    modifier onlyPortfolioAgent() {
        require(roleManager.hasRole(PORTFOLIO_AGENT_ROLE, _msgSender()), "Restricted to Portfolio Agent");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Restricted to admins");
        _;
    }

    modifier notPaused() {
        require(!paused, "pause");
        _;
    }

    function setExchanger(address _exchanger) external onlyAdmin {
        require(_exchanger != address(0), 'exchange is zero');
        exchange = _exchanger;
        emit ExchangerUpdated(_exchanger);
    }

    function setPayoutManager(address _payoutManager) external onlyAdmin {
        require(_payoutManager != address(0), 'payoutManager is zero');
        payoutManager = _payoutManager;
        emit PayoutManagerUpdated(_payoutManager);
    }

    function setRoleManager(address _roleManager) external onlyAdmin {
        require(_roleManager != address(0), 'roleManager is zero');
        roleManager = IRoleManager(_roleManager);
        emit RoleManagerUpdated(_roleManager);
    }

    function pause() public onlyPortfolioAgent {
        paused = true;
    }

    function unpause() public onlyPortfolioAgent {
        paused = false;
    }

    function isPaused() external view returns (bool) {
        return paused;
    }

    /**
     * @notice Returns the name of the token.
     */
    function name() public view returns (string memory) {
        return _name;
    }

    /**
     * @notice Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view returns (string memory) {
        return _symbol;
    }

    /**
     * @notice Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei.
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public virtual view returns (uint8) {
        return _decimals;
    }


    /**
     * @return The total supply of USD+.
     */
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function ownersLength() public view returns (uint256) {
        return owners.length();
    }


    function ownerAt(uint256 index) external view returns (address) {
        return owners.at(index);
    }

    /**
     * @return High resolution rebasingCreditsPerToken
     */
    function rebasingCreditsPerToken() public view returns (uint256) {
        return _rebasingCreditsPerToken;
    }

    /**
     * @return High resolution total number of rebasing credits
     */
    function rebasingCredits() public view returns (uint256) {
        return _rebasingCredits;
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param _account Address to query the balance of.
     * @return A uint256 representing the amount of base units owned by the
     *         specified address.
     */
    function balanceOf(address _account)
        public
        view
        override
        returns (uint256)
    {
        if (_sharesBalances[_account] != 0) {
            return creditToAsset(_creditBalances[_account]); 
        }
        return 0;
    }

    function sharesBalanceOf(address _account) 
        public
        view
        returns (uint256)
    {
        return _sharesBalances[_account];
    }

    /**
     * @dev Gets the credits balance of the specified address.
     * @dev Backwards compatible with old low res credits per token.
     * @param _account The address to query the balance of.
     * @return (uint256, uint256) Credit balance and credits per token of the
     *         address
     */
    function creditsBalanceOf(address _account)
        public
        view
        returns (uint256, uint256)
    {
        uint256 cpt = _creditsPerToken();
        if (cpt == 1e27) {
            // For a period before the resolution upgrade, we created all new
            // contract accounts at high resolution. Since they are not changing
            // as a result of this upgrade, we will return their true values
            return (_creditBalances[_account], cpt);
        } else {
            return (
                _creditBalances[_account] / RESOLUTION_INCREASE,
                cpt / RESOLUTION_INCREASE
            );
        }
    }

    /**
     * @dev Gets the credits balance of the specified address.
     * @param _account The address to query the balance of.
     * @return (uint256, uint256) Credit balance, credits per token of the address
     */
    function creditsBalanceOfHighres(address _account)
        public
        view
        returns (
            uint256,
            uint256
        )
    {
        return (
            _creditBalances[_account],
            _creditsPerToken()
        );
    }

    /**
     * @dev Transfer tokens to a specified address.
     * @param _to the address to transfer to.
     * @param _value the amount to be transferred.
     * @return true on success.
     */
    function transfer(address _to, uint256 _value)
        public
        override
        notPaused
        returns (bool)
    {
        require(_to != address(0), "Transfer to zero address");
        require(
            _value <= balanceOf(msg.sender),
            "Transfer greater than balance"
        );

        _executeTransfer(msg.sender, _to, _value);

        emit Transfer(msg.sender, _to, _value);

        return true;
    }

    /**
     * @dev Converts usd+ balance value to credits
     * @param amount The amount for conversion in usd+
     * @return credit The number of tokens in credits
     */
    function assetToCredit(uint256 amount) public view returns(uint256 credit) {
        if (amount > MAX_SUPPLY / 10 ** 45) {
            return MAX_SUPPLY;
        }
        uint256 amountRay = WadRayMath.wadToRay(amount);
        uint256 creditsPerTokenRay = WadRayMath.wadToRay(_rebasingCreditsPerToken);
        uint256 creditRay = WadRayMath.rayMul(amountRay, creditsPerTokenRay);
        return WadRayMath.rayToWad(creditRay);
    }

    /**
     * @dev Converts credits balance value to usd+
     * @param credit The amount for conversion in credits
     * @return asset The number of tokens in credits
     */
    function creditToAsset(uint256 credit) public view returns(uint256 asset) {
        if (credit >= MAX_SUPPLY / 10 ** 36) {
            return MAX_SUPPLY;
        }
        uint256 creditBalancesRay = WadRayMath.wadToRay(credit);
        uint256 creditsPerTokenRay = WadRayMath.wadToRay(_rebasingCreditsPerToken);
        uint256 balanceOfRay = WadRayMath.rayDiv(creditBalancesRay, creditsPerTokenRay);
        return WadRayMath.rayToWad(balanceOfRay);
    }

    /**
     * @dev This method subtracts credits. Due to the fact that credits
     * are stored with increased accuracy (1e9), we consider as
     * the same number everything that equal like amounts.
     * @param credit1 The minuend number in credits (increased accuracy)
     * @param credit2 The subtrahend number in credits (increased accuracy)
     * @param errorText Text for error if the subtrahend is much greater than the minuend
     * @return resultCredit The number of tokens in credits
     */
    function subCredits(uint256 credit1, uint256 credit2, string memory errorText) public view returns(uint256 resultCredit) {
        uint256 amount1 = creditToAsset(credit1);
        uint256 amount2 = creditToAsset(credit2);
        if (amount1 == MAX_SUPPLY || amount1 + 1 >= amount2) {
            return credit1 >= credit2 ? credit1 - credit2 : 0;
        } else {
            revert(errorText);
        }
    }

    /**
     * @dev Transfer tokens from one address to another.
     * @param _from The address you want to send tokens from.
     * @param _to The address you want to transfer to.
     * @param _value The amount of tokens to be transferred.
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public override notPaused returns (bool) {
        require(_to != address(0), "Transfer to zero address");
        require(_value <= balanceOf(_from), "Transfer greater than balance");

        uint256 scaledAmount = assetToCredit(_value);

        _allowances[_from][msg.sender] = subCredits(_allowances[_from][msg.sender], scaledAmount, "Allowance amount exceeds balance");

        _executeTransfer(_from, _to, _value);

        emit Transfer(_from, _to, _value);

        return true;
    }

    /**
     * @dev Update the count of non rebasing credits in response to a transfer
     * @param _from The address you want to send tokens from.
     * @param _to The address you want to transfer to.
     * @param _value Amount of USD+ to transfer
     */
    function _executeTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal {

        uint256 creditsCredited = assetToCredit(_value);
        uint256 creditsDeducted = assetToCredit(_value);

        _creditBalances[_from] = subCredits(_creditBalances[_from], creditsDeducted, "Transfer amount exceeds balance");
        _creditBalances[_to] = _creditBalances[_to].add(creditsCredited);
    }

    /**
     * @dev Function to check the amount of tokens that _owner has allowed to
     *      `_spender`.
     * @param _owner The address which owns the funds.
     * @param _spender The address which will spend the funds.
     * @return The number of tokens still available for the _spender.
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
     * @dev Approve the passed address to spend the specified amount of tokens
     *      on behalf of msg.sender. This method is included for ERC20
     *      compatibility. `increaseAllowance` and `decreaseAllowance` should be
     *      used instead.
     *
     *      Changing an allowance with this method brings the risk that someone
     *      may transfer both the old and the new allowance - if they are both
     *      greater than zero - if a transfer transaction is mined before the
     *      later approve() call is mined.
     * @param _spender The address which will spend the funds.
     * @param _value The amount of tokens to be spent.
     */
    function approve(address _spender, uint256 _value)
        public
        override
        notPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(_value);
        _allowances[msg.sender][_spender] = scaledAmount;
        emit Approval(msg.sender, _spender, scaledAmount);
        return true;
    }

    /**
     * @dev Increase the amount of tokens that an owner has allowed to
     *      `_spender`.
     *      This method should be used instead of approve() to avoid the double
     *      approval vulnerability described above.
     * @param _spender The address which will spend the funds.
     * @param _addedValue The amount of tokens to increase the allowance by.
     */
    function increaseAllowance(address _spender, uint256 _addedValue)
        public
        notPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(_addedValue);
        _allowances[msg.sender][_spender] = _allowances[msg.sender][_spender]
            .add(scaledAmount);
        emit Approval(msg.sender, _spender, _allowances[msg.sender][_spender]);
        return true;
    }

    /**
     * @dev Decrease the amount of tokens that an owner has allowed to
            `_spender`.
     * @param _spender The address which will spend the funds.
     * @param _subtractedValue The amount of tokens to decrease the allowance
     *        by.
     */
    function decreaseAllowance(address _spender, uint256 _subtractedValue)
        public
        notPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(_subtractedValue);
        _allowances[msg.sender][_spender] = (_allowances[msg.sender][_spender] >= scaledAmount) ? _allowances[msg.sender][_spender] - scaledAmount: 0;
        emit Approval(msg.sender, _spender, _allowances[msg.sender][_spender]);
        return true;
    }

    /**
     * @dev Mints new tokens, increasing totalSupply.
     */
    function mint(address _account, uint256 _amount) external notPaused onlyAdmin {
        _mint(_account, _amount);
    }

    function _mint(address _account, uint256 _amount) internal nonReentrant {
        require(_account != address(0), "Mint to the zero address");

        uint256 creditAmount = assetToCredit(_amount);
        _creditBalances[_account] = _creditBalances[_account].add(creditAmount);

        // If the account is non rebasing and doesn't have a set creditsPerToken
        // then set it i.e. this is a mint from a fresh contract
        
        _rebasingCredits = _rebasingCredits.add(creditAmount);
        
        _totalSupply = _totalSupply.add(_amount);

        require(_totalSupply <= MAX_SUPPLY, "Max supply");

        _afterTokenTransfer(address(0), _account, _amount);

        emit Transfer(address(0), _account, _amount);
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
    function giveShares(address _account, uint256 _amount) internal nonReentrant {
        require(_account != address(0), "Mint to the zero address");

        _sharesBalances[_account] += _amount;
        
        _totalShares = _totalShares.add(_amount);

        _afterTokenTransfer(address(0), _account, _amount);

        emit Transfer(address(0), _account, _amount);
    }

    function burnShares(address _account, uint256 _amount) external notPaused onlyExchanger {
        require(_account != address(0));

        _totalShares -= _amount;       

        _sharesBalances[_account] -= _amount;
    }

    /**
     * @dev Burns tokens, decreasing totalSupply.
     */
    function burn(address account, uint256 amount) external notPaused onlyExchanger {
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
        require(_amount <= balanceOf(_account)); // shares number shant be included 
        if (_amount == 0) {
            emit Transfer(_account, address(0), _amount);
            return;
        }

        uint256 creditAmount = assetToCredit(_amount);
        _creditBalances[_account] = subCredits(_creditBalances[_account], creditAmount, "Burn amount exceeds balance");

        _rebasingCredits = _rebasingCredits.sub(creditAmount);
        
        _totalSupply = _totalSupply.sub(_amount);

        _afterTokenTransfer(_account, address(0), _amount);

        emit Transfer(_account, address(0), _amount);
    }

    /**
     * @dev Get the credits per token for an account. Returns a fixed amount
     *      if the account is non-rebasing.
     */
    function _creditsPerToken()
        internal
        view
        returns (uint256)
    {    
        return _rebasingCreditsPerToken;
    }

    /**
     * @dev Modify the supply without minting new tokens. This uses a change in
     *      the exchange rate between "credits" and USD+ tokens to change balances.
     * @param _newTotalSupply New total supply of USD+.
     */
    function changeSupply(uint256 _newTotalSupply, uint256 _totalDeposit)
        external
        onlyExchanger
        nonReentrant
        notPaused
        
    {
        require(_totalSupply > 0, "Cannot increase 0 supply");
        require(_newTotalSupply >= _totalSupply + _totalDeposit, 'negative rebase');

        if (_totalSupply == _newTotalSupply) {
            emit TotalSupplyUpdatedHighres(
                _totalSupply,
                _rebasingCredits,
                _rebasingCreditsPerToken
            );
            return;
        }

        uint256 delta = _newTotalSupply - _totalSupply - _totalDeposit;

        uint256 baseDelta = delta * _totalDeposit / (_totalSupply + _totalDeposit);
        uint256 teamDelta = delta - baseDelta;
        
        uint256 ownersCount = ownersLength();

        for(uint256 i = 0; i < ownersCount; i++) {
            address curOwner = owners.at(i); 
            _mint(curOwner, _sharesBalances[curOwner] * baseDelta / _totalShares);
        }

        _totalSupply = _totalSupply + teamDelta > MAX_SUPPLY
            ? MAX_SUPPLY
            : _totalSupply + teamDelta;

        _rebasingCreditsPerToken = _rebasingCredits.divPrecisely( 
            _totalSupply
        );
        

        require(_rebasingCreditsPerToken > 0, "Invalid change in supply");


        emit TotalSupplyUpdatedHighres(
            _totalSupply,
            _rebasingCredits,
            _rebasingCreditsPerToken
        );

        return;
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal {

        if (from == to) {
            return;
        }

        if (from == address(0)) {
            // mint
            owners.add(to);
        } else if (to == address(0)) {
            // burn
            if (balanceOf(from) == 0) {
                owners.remove(from);
            }
        } else {
            // transfer
            if (balanceOf(from) == 0) {
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