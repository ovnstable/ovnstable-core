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
import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IPayoutManager.sol";

contract UsdPlusToken is Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;
    using StableMath for uint256;

    uint256 private constant MAX_SUPPLY = type(uint256).max; // сматчили переименовыванием MAX_UINT_VALUE и поменяли public на private
    uint256 private constant RESOLUTION_INCREASE = 1e9; // это новая константа, ее не было в предыдущем usd+
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    mapping(address => uint256) private _creditBalances; // сматчили переименовыванием _balances

    bytes32 private DELETED_0; // тут был старый _allowances

    uint256 private _totalSupply; // сматчили без переименовывания и поменяли private на public

    string private _name; // сматчили без переименовывания, полное совпадение
    string private _symbol; // сматчили без переименовывания, полное совпадение

    uint256 private _rebasingCredits; // сматчили с изменением смыла переменной, была _totalMint
    uint256 private _rebasingCreditsPerToken; // сматчили с изменением смыла переменной, была _totalBurn

    uint256 public nonRebasingSupply; // сматчили с изменением смыла переменной, была liquidityIndexChangeTime
    uint256 private DELETED_1; // не будет использоваться, был liquidityIndex
    uint256 private DELETED_2; // не будет использоваться, был liquidityIndexDenominator

    EnumerableSet.AddressSet _owners; // этой логики нет в ousd, но она будет присутствовать в новой версии usd+

    address public exchange; // в ousd есть аналог vaultAddress, но я его переименовал в эксченджер везде
    uint8 private _decimals; // сматчили без переименовывания, полное совпадение
    address public payoutManager;

    mapping(address => uint256) public nonRebasingCreditsPerToken; // это новый маппинг, его не было в предыдущем usd+
    mapping(address => RebaseOptions) public rebaseState; // это новый маппинг, его не было в предыдущем usd+
    EnumerableSet.AddressSet _nonRebaseOwners;
    mapping(address => mapping(address => uint256)) private _allowances; // старый маппинг, но на новом месте

    // ReentrancyGuard logic
    uint256 private _status;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    // ReentrancyGuard logic end

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


    // ------ Migration section --------
    // ------ Removed after upgrade ----

    mapping(address => bool) public migrated;

    modifier onlyDev() {
        address devAddress = 0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD;
        require(devAddress == msg.sender, "Caller is not the Dev");
        _;
    }

    function rayMul(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 RAY = 1e27;
        uint256 halfRAY = RAY / 2;
        if (a == 0 || b == 0) {
            return 0;
        }
        require(a <= (type(uint256).max - halfRAY) / b, "Errors.MATH_MULTIPLICATION_OVERFLOW");
        return (a * b + halfRAY) / RAY;
    }

    function rayToWad(uint256 a) internal pure returns (uint256) {
        uint256 WAD_RAY_RATIO = 1e9;
        uint256 halfRatio = WAD_RAY_RATIO / 2;
        uint256 result = halfRatio + a;
        require(result >= halfRatio, "Errors.MATH_ADDITION_OVERFLOW");
        return result / WAD_RAY_RATIO;
    }

    function migrationInit(address _exchange, uint8 decimals, address _payoutManager) public onlyDev {
        require(nonRebasingSupply != 0, "already migrationInit");

        DELETED_0 = bytes32(0);
        uint256 liquidityIndex = DELETED_1;

        _rebasingCreditsPerToken = 10 ** 27;
        nonRebasingSupply = 0;
        _totalSupply = rayToWad(rayMul(_totalSupply, liquidityIndex));
        _rebasingCredits = _totalSupply;

        payoutManager = _payoutManager;
        exchange = _exchange;
        _decimals = decimals;
        _status = _NOT_ENTERED;
    }

    function migrationBatchLength(uint256 size) public view returns (uint256) {
        uint256 len = _owners.length();
        return (len / size * size == len) ? len / size : len / size + 1;
    }

    function migrationBatch(uint256 size, uint256 iter) public onlyDev {
        uint256 liquidityIndex = DELETED_1;
        uint256 len = _owners.length();
        uint256 startIter = iter * size;
        uint256 finishIter = (iter + 1) * size  > len ? len : (iter + 1) * size;

        for (uint256 index = startIter; index < finishIter; index++) {
            address user = _owners.at(index);
            if (!migrated[user]) {
                _creditBalances[user] = rayToWad(rayMul(_creditBalances[user], liquidityIndex));
                _creditBalances[user] = _creditBalances[user].mulTruncate(_rebasingCreditsPerToken);
                rebaseState[user] = RebaseOptions.OptIn;
                migrated[user] = true;
            }
        }
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(string calldata name, string calldata symbol, uint8 decimals) initializer public {
        __Context_init_unchained();
        _name = name;
        _symbol = symbol;

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _decimals = decimals;
        _rebasingCreditsPerToken = 10 ** 27;
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

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Restricted to admins");
        _;
    }

    function setExchanger(address _exchanger) external onlyAdmin {
        require(_exchanger != address(this), 'exchange is zero');
        exchange = _exchanger;
        emit ExchangerUpdated(_exchanger);
    }

    function setPayoutManager(address _payoutManager) external onlyAdmin {
        require(_payoutManager != address(this), 'payoutManager is zero');
        payoutManager = _payoutManager;
        emit PayoutManagerUpdated(_payoutManager);
    }

    function setDecimals(uint8 decimals) external onlyAdmin {
        require(_decimals == 0, 'Decimals already set');
        _decimals = decimals;
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
    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function ownerLength() external view returns (uint256) {
        return _owners.length();
    }

    function ownerAt(uint256 index) external view returns (address) {
        return _owners.at(index);
    }

    function ownerBalanceAt(uint256 index) external view returns (uint256) {
        return balanceOf(_owners.at(index));
    }


    /**
     * @return The total supply of USD+.
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
    function balanceOf(address _account)
        public
        view
        override
        returns (uint256)
    {
        if (_creditBalances[_account] == 0) return 0;
        return
            _creditBalances[_account].divPrecisely(_creditsPerToken(_account));
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
        uint256 cpt = _creditsPerToken(_account);
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
            _creditsPerToken(_account)
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
     * @dev Transfer tokens from one address to another.
     * @param _from The address you want to send tokens from.
     * @param _to The address you want to transfer to.
     * @param _value The amount of tokens to be transferred.
     */
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public override returns (bool) {
        require(_to != address(0), "Transfer to zero address");
        require(_value <= balanceOf(_from), "Transfer greater than balance");

        _allowances[_from][msg.sender] = _allowances[_from][msg.sender].sub(
            _value
        );

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

        _beforeTokenTransfer(_from, _to, _value);

        bool isNonRebasingTo = _isNonRebasingAccount(_to);
        bool isNonRebasingFrom = _isNonRebasingAccount(_from);

        // Credits deducted and credited might be different due to the
        // differing creditsPerToken used by each account
        uint256 creditsCredited = _value.mulTruncate(_creditsPerToken(_to));
        uint256 creditsDeducted = _value.mulTruncate(_creditsPerToken(_from));

        _creditBalances[_from] = _creditBalances[_from].sub(
            creditsDeducted,
            "Transfer amount exceeds balance"
        );
        _creditBalances[_to] = _creditBalances[_to].add(creditsCredited);

        if (isNonRebasingTo && !isNonRebasingFrom) {
            // Transfer to non-rebasing account from rebasing account, credits
            // are removed from the non rebasing tally
            nonRebasingSupply = nonRebasingSupply.add(_value);
            // Update rebasingCredits by subtracting the deducted amount
            _rebasingCredits = _rebasingCredits.sub(creditsDeducted);
        } else if (!isNonRebasingTo && isNonRebasingFrom) {
            // Transfer to rebasing account from non-rebasing account
            // Decreasing non-rebasing credits by the amount that was sent
            nonRebasingSupply = nonRebasingSupply.sub(_value);
            // Update rebasingCredits by adding the credited amount
            _rebasingCredits = _rebasingCredits.add(creditsCredited);
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
    function allowance(address _owner, address _spender)
        public
        view
        override
        returns (uint256)
    {
        return _allowances[_owner][_spender];
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
        returns (bool)
    {
        _allowances[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
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
        returns (bool)
    {
        _allowances[msg.sender][_spender] = _allowances[msg.sender][_spender]
            .add(_addedValue);
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
        returns (bool)
    {
        uint256 oldValue = _allowances[msg.sender][_spender];
        if (_subtractedValue >= oldValue) {
            _allowances[msg.sender][_spender] = 0;
        } else {
            _allowances[msg.sender][_spender] = oldValue.sub(_subtractedValue);
        }
        emit Approval(msg.sender, _spender, _allowances[msg.sender][_spender]);
        return true;
    }

    /**
     * @dev Mints new tokens, increasing totalSupply.
     */
    function mint(address _account, uint256 _amount) external onlyExchanger {
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

        uint256 creditAmount = _amount.mulTruncate(_creditsPerToken(_account));
        _creditBalances[_account] = _creditBalances[_account].add(creditAmount);

        // If the account is non rebasing and doesn't have a set creditsPerToken
        // then set it i.e. this is a mint from a fresh contract
        if (isNonRebasingAccount) {
            nonRebasingSupply = nonRebasingSupply.add(_amount);
        } else {
            _rebasingCredits = _rebasingCredits.add(creditAmount);
        }

        _totalSupply = _totalSupply.add(_amount);

        require(_totalSupply < MAX_SUPPLY, "Max supply");

        _afterTokenTransfer(address(0), _account, _amount);

        emit Transfer(address(0), _account, _amount);
    }

    /**
     * @dev Burns tokens, decreasing totalSupply.
     */
    function burn(address account, uint256 amount) external onlyExchanger {
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
            return;
        }

        _beforeTokenTransfer(address(0), _account, _amount);

        bool isNonRebasingAccount = _isNonRebasingAccount(_account);
        uint256 creditAmount = _amount.mulTruncate(_creditsPerToken(_account));
        uint256 currentCredits = _creditBalances[_account];

        // Remove the credits, burning rounding errors
        if (
            currentCredits == creditAmount || currentCredits - 1 == creditAmount
        ) {
            // Handle dust from rounding
            _creditBalances[_account] = 0;
        } else if (currentCredits > creditAmount) {
            _creditBalances[_account] = _creditBalances[_account].sub(
                creditAmount
            );
        } else {
            revert("Remove exceeds balance");
        }

        // Remove from the credit tallies and non-rebasing supply
        if (isNonRebasingAccount) {
            nonRebasingSupply = nonRebasingSupply.sub(_amount);
        } else {
            _rebasingCredits = _rebasingCredits.sub(creditAmount);
        }

        _totalSupply = _totalSupply.sub(_amount);

        _afterTokenTransfer(address(0), _account, _amount);

        emit Transfer(_account, address(0), _amount);
    }

    /**
     * @dev Get the credits per token for an account. Returns a fixed amount
     *      if the account is non-rebasing.
     * @param _account Address of the account.
     */
    function _creditsPerToken(address _account)
        internal
        view
        returns (uint256)
    {
        if (nonRebasingCreditsPerToken[_account] != 0) {
            return nonRebasingCreditsPerToken[_account];
        } else {
            return _rebasingCreditsPerToken;
        }
    }

    function _isNonRebasingAccount(address _account) internal returns (bool) {
        return rebaseState[_account] == RebaseOptions.OptOut;
    }

    /**
     * @dev Add a contract address to the non-rebasing exception list. The
     * address's balance will be part of rebases and the account will be exposed
     * to upside and downside.
     */
    function rebaseOptIn(address _address) public onlyPayoutManager nonReentrant {
        require(_isNonRebasingAccount(_address), "Account has not opted out");

        // Convert balance into the same amount at the current exchange rate
        uint256 newCreditBalance = _creditBalances[_address]
            .mul(_rebasingCreditsPerToken)
            .div(_creditsPerToken(_address));

        // Decreasing non rebasing supply
        nonRebasingSupply = nonRebasingSupply.sub(balanceOf(_address));

        _creditBalances[_address] = newCreditBalance;

        // Increase rebasing credits, totalSupply remains unchanged so no
        // adjustment necessary
        _rebasingCredits = _rebasingCredits.add(_creditBalances[_address]);

        rebaseState[_address] = RebaseOptions.OptIn;

        // Delete any fixed credits per token
        delete nonRebasingCreditsPerToken[_address];

        _nonRebaseOwners.remove(_address);
    }

    /**
     * @dev Explicitly mark that an address is non-rebasing.
     */
    function rebaseOptOut(address _address) public onlyPayoutManager nonReentrant {
        require(!_isNonRebasingAccount(_address), "Account has not opted in");

        // Increase non rebasing supply
        nonRebasingSupply = nonRebasingSupply.add(balanceOf(_address));
        // Set fixed credits per token
        nonRebasingCreditsPerToken[_address] = _rebasingCreditsPerToken;

        // Decrease rebasing credits, total supply remains unchanged so no
        // adjustment necessary
        _rebasingCredits = _rebasingCredits.sub(_creditBalances[_address]);

        // Mark explicitly opted out of rebasing
        rebaseState[_address] = RebaseOptions.OptOut;

        _nonRebaseOwners.add(_address);
    }

    /**
     * @dev Modify the supply without minting new tokens. This uses a change in
     *      the exchange rate between "credits" and USD+ tokens to change balances.
     * @param _newTotalSupply New total supply of USD+.
     */
    function changeSupply(uint256 _newTotalSupply)
        external
        onlyExchanger
        nonReentrant
        returns (NonRebaseInfo [] memory, uint256)
    {
        require(_totalSupply > 0, "Cannot increase 0 supply");

        if (_totalSupply == _newTotalSupply) {
            emit TotalSupplyUpdatedHighres(
                _totalSupply,
                _rebasingCredits,
                _rebasingCreditsPerToken
            );
            return (new NonRebaseInfo[](0), 0);
        }

        uint256 delta = _newTotalSupply - _totalSupply;
        uint256 deltaNR = delta * nonRebasingSupply / _totalSupply;
        uint256 deltaR = delta - deltaNR;

        _totalSupply = _totalSupply + deltaR > MAX_SUPPLY
            ? MAX_SUPPLY
            : _totalSupply + deltaR;

        if (_totalSupply.sub(nonRebasingSupply) != 0) {
            _rebasingCreditsPerToken = _rebasingCredits.divPrecisely(
                _totalSupply.sub(nonRebasingSupply)
            );
        }

        require(_rebasingCreditsPerToken > 0, "Invalid change in supply");

        _totalSupply = _rebasingCredits
            .divPrecisely(_rebasingCreditsPerToken)
            .add(nonRebasingSupply);

        NonRebaseInfo [] memory nonRebaseInfo = new NonRebaseInfo[](_nonRebaseOwners.length());
        for (uint256 i = 0; i < nonRebaseInfo.length; i++) {
            address userAddress = _nonRebaseOwners.at(i);
            uint256 userBalance = balanceOf(userAddress);
            uint256 userPart = (nonRebasingSupply != 0) ? userBalance * deltaNR / nonRebasingSupply : 0;
            nonRebaseInfo[i].pool = userAddress;
            nonRebaseInfo[i].amount = userPart;
        }

        emit TotalSupplyUpdatedHighres(
            _totalSupply,
            _rebasingCredits,
            _rebasingCreditsPerToken
        );

        return (nonRebaseInfo, deltaNR);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal {

    }


    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal {

        if (from == address(0)) {
            // mint
            _owners.add(to);
        } else if (to == address(0)) {
            // burn
            if (balanceOf(from) == 0) {
                _owners.remove(from);
            }
        } else {
            // transfer
            if (balanceOf(from) == 0) {
                _owners.remove(from);
            }
            _owners.add(to);
        }
    }


}
