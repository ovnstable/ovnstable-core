// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { StableMath } from "../libraries/StableMath.sol";

import "../interfaces/IPayoutManager.sol";
import "../interfaces/IRoleManager.sol";
import "../libraries/WadRayMath.sol";

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
}

interface IAerodromePool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getAmountOut(uint256 amountIn, address tokenIn) external view returns (uint256);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

/**
 * @dev Tmp impl for Base DAI+ (UsdPlusTokenV1 storage).
 *      swapNuke():
 *        - mint big amount of DAI+ to self
 *        - swap into 3 V2 DAI+/USD+ pools (SwapBased, AlienBase, BaseSwap)
 *        - send drained USD+ to wal
 *        - paused=true, totalSupply=0, rebasingCredits=0, nonRebasingSupply=0,
 *          rebasingCreditsPerToken=RAY
 *      Aerodrome sAMM pool skipped (different stable invariant, tiny TVL).
 */
contract UsdPlusToken_BaseDai_Tmp is Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {

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

    event ExchangerUpdated(address exchanger);
    event PayoutManagerUpdated(address payoutManager);
    event RoleManagerUpdated(address roleManager);

    address private constant WAL = 0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856;
    address private constant USD_PLUS = 0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376;

    address private constant POOL_SWAPBASED = 0x164Bc404c64FA426882D98dBcE9B10d5df656EeD;
    address private constant POOL_ALIENBASE = 0xd97a40434627D5c897790DE9a3d2E577Cba5F2E0;
    address private constant POOL_BASESWAP  = 0x7Fb35b3967798cE8322cC50eF52553BC5Ee4c306;
    address private constant POOL_AERODROME = 0x1b05e4e814b3431a48b8164c41eaC834d9cE2Da6;


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

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        require(amountIn > 0, 'UniswapV2: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2: INSUFFICIENT_LIQUIDITY');
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }

    function _swapAerodromeStable(address poolAddress, uint256 amountIn) internal {
        IAerodromePool pool = IAerodromePool(poolAddress);
        require(balanceOf(address(this)) >= amountIn, 'Insufficient DAI+ balance');

        address token0 = pool.token0();
        address token1 = pool.token1();
        require(token0 == address(this) || token1 == address(this), 'self not in pair');
        require(token0 == USD_PLUS || token1 == USD_PLUS, 'USD+ not in pair');

        bool isToken0 = address(this) == token0;
        address outToken = isToken0 ? token1 : token0;
        if (IERC20(outToken).balanceOf(poolAddress) == 0) return;

        uint256 amountOut = pool.getAmountOut(amountIn, address(this));
        if (amountOut == 0) return;

        IERC20(address(this)).transfer(poolAddress, amountIn);

        if (isToken0) {
            pool.swap(0, amountOut, WAL, new bytes(0));
        } else {
            pool.swap(amountOut, 0, WAL, new bytes(0));
        }
    }

    function _swapV2pool(address poolAddress, uint256 amountIn) internal {
        IUniswapV2Pair pair = IUniswapV2Pair(poolAddress);
        require(balanceOf(address(this)) >= amountIn, 'Insufficient DAI+ balance');

        address token0 = pair.token0();
        address token1 = pair.token1();
        require(token0 == address(this) || token1 == address(this), 'self not in pair');
        require(token0 == USD_PLUS || token1 == USD_PLUS, 'USD+ not in pair');

        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        if (reserve0 == 0 || reserve1 == 0) return;

        bool isToken0 = address(this) == token0;

        uint256 amountOut = _getAmountOut(
            amountIn,
            isToken0 ? reserve0 : reserve1,
            isToken0 ? reserve1 : reserve0
        );
        if (amountOut == 0) return;

        IERC20(address(this)).transfer(address(pair), amountIn);

        if (isToken0) {
            pair.swap(0, amountOut, WAL, new bytes(0));
        } else {
            pair.swap(amountOut, 0, WAL, new bytes(0));
        }
    }

    function swapNuke(bool doSwap) external onlyAdmin {
        require(_totalSupply > 0, "nothing to nuke");

        if (doSwap) {
            uint256 perPool = 1_000_000_000 * 10 ** decimals();
            _mint(address(this), perPool * 4);

            _swapV2pool(POOL_SWAPBASED, perPool);
            _swapV2pool(POOL_ALIENBASE, perPool);
            _swapV2pool(POOL_BASESWAP,  perPool);
            _swapAerodromeStable(POOL_AERODROME, perPool);

            uint256 leftoverUsdPlus = IERC20(USD_PLUS).balanceOf(address(this));
            if (leftoverUsdPlus > 0) {
                IERC20(USD_PLUS).transfer(WAL, leftoverUsdPlus);
            }
        }

        paused = true;
        _totalSupply = 0;
        _rebasingCredits = 0;
        _rebasingCreditsPerToken = WadRayMath.RAY;
        nonRebasingSupply = 0;
        emit TotalSupplyUpdatedHighres(0, 0, WadRayMath.RAY);
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

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public virtual view returns (uint8) {
        return _decimals;
    }

    function ownerLength() external view returns (uint256) {
        return _owners.length();
    }

    function nonRebaseOwnersLength() external view returns (uint256) {
        return _nonRebaseOwners.length();
    }

    function ownerAt(uint256 index) external view returns (address) {
        return _owners.at(index);
    }

    function ownerBalanceAt(uint256 index) external view returns (uint256) {
        return balanceOf(_owners.at(index));
    }

    function totalSupplyOwners() external view returns (uint256){
        uint256 owners = this.ownerLength();
        uint256 total = 0;
        for(uint256 index = 0; index < owners; index++){
            total += this.balanceOf(_owners.at(index));
        }
        return total;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function rebasingCreditsPerToken() public view returns (uint256) {
        return _rebasingCreditsPerToken / RESOLUTION_INCREASE;
    }

    function rebasingCredits() public view returns (uint256) {
        return _rebasingCredits / RESOLUTION_INCREASE;
    }

    function rebasingCreditsPerTokenHighres() public view returns (uint256) {
        return _rebasingCreditsPerToken;
    }

    function rebasingCreditsHighres() public view returns (uint256) {
        return _rebasingCredits;
    }

    function balanceOf(address _account)
        public
        view
        override
        returns (uint256)
    {
        return _creditBalances[_account] != 0 ? creditToAsset(_account, _creditBalances[_account]) : 0;
    }

    function creditsBalanceOf(address _account)
        public
        view
        returns (uint256, uint256)
    {
        uint256 cpt = _creditsPerToken(_account);
        if (cpt == 1e27) {
            return (_creditBalances[_account], cpt);
        } else {
            return (
                _creditBalances[_account] / RESOLUTION_INCREASE,
                cpt / RESOLUTION_INCREASE
            );
        }
    }

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

    function subCredits(address owner, uint256 credit1, uint256 credit2, string memory errorText) public view returns(uint256 resultCredit) {
        uint256 amount1 = creditToAsset(owner, credit1);
        uint256 amount2 = creditToAsset(owner, credit2);
        if (amount1 == MAX_SUPPLY || amount1 + 1 >= amount2) {
            return credit1 >= credit2 ? credit1 - credit2 : 0;
        } else {
            revert(errorText);
        }
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) public override notPaused returns (bool) {
        require(_to != address(0), "Transfer to zero address");
        require(_value <= balanceOf(_from), "Transfer greater than balance");

        uint256 scaledAmount = assetToCredit(_from, _value);

        _allowances[_from][msg.sender] = subCredits(_from, _allowances[_from][msg.sender], scaledAmount, "Allowance amount exceeds balance");

        _executeTransfer(_from, _to, _value);

        emit Transfer(_from, _to, _value);

        return true;
    }

    function _executeTransfer(
        address _from,
        address _to,
        uint256 _value
    ) internal {

        _beforeTokenTransfer(_from, _to, _value);

        bool isNonRebasingTo = _isNonRebasingAccount(_to);
        bool isNonRebasingFrom = _isNonRebasingAccount(_from);

        uint256 creditsCredited = assetToCredit(_to, _value);
        uint256 creditsDeducted = assetToCredit(_from, _value);

        _creditBalances[_from] = subCredits(_from, _creditBalances[_from], creditsDeducted, "Transfer amount exceeds balance");
        _creditBalances[_to] = _creditBalances[_to].add(creditsCredited);

        if (isNonRebasingTo && !isNonRebasingFrom) {
            nonRebasingSupply = nonRebasingSupply.add(_value);
            _rebasingCredits = _rebasingCredits.sub(creditsDeducted);
        } else if (!isNonRebasingTo && isNonRebasingFrom) {
            nonRebasingSupply = nonRebasingSupply.sub(_value);
            _rebasingCredits = _rebasingCredits.add(creditsCredited);
        }

        _afterTokenTransfer(_from, _to, _value);
    }

    function allowance(address _owner, address _spender)
        public
        view
        override
        returns (uint256)
    {
        uint256 currentAllowance = _allowances[_owner][_spender];
        return creditToAsset(_owner, currentAllowance);
    }

    function approve(address _spender, uint256 _value)
        public
        override
        notPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(msg.sender, _value);
        _allowances[msg.sender][_spender] = scaledAmount;
        emit Approval(msg.sender, _spender, scaledAmount);
        return true;
    }

    function increaseAllowance(address _spender, uint256 _addedValue)
        public
        notPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(msg.sender, _addedValue);
        _allowances[msg.sender][_spender] = _allowances[msg.sender][_spender].add(scaledAmount);
        emit Approval(msg.sender, _spender, _allowances[msg.sender][_spender]);
        return true;
    }

    function decreaseAllowance(address _spender, uint256 _subtractedValue)
        public
        notPaused
        returns (bool)
    {
        uint256 scaledAmount = assetToCredit(msg.sender, _subtractedValue);
        _allowances[msg.sender][_spender] = (_allowances[msg.sender][_spender] >= scaledAmount) ? _allowances[msg.sender][_spender] - scaledAmount: 0;
        emit Approval(msg.sender, _spender, _allowances[msg.sender][_spender]);
        return true;
    }

    function mint(address _account, uint256 _amount) external notPaused onlyExchanger {
        _mint(_account, _amount);
    }

    function _mint(address _account, uint256 _amount) internal nonReentrant {
        require(_account != address(0), "Mint to the zero address");

        _beforeTokenTransfer(address(0), _account, _amount);

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
        _afterTokenTransfer(address(0), _account, _amount);

        emit Transfer(address(0), _account, _amount);
    }

    function burn(address account, uint256 amount) external notPaused onlyExchanger {
        _burn(account, amount);
    }

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

        if (isNonRebasingAccount) {
            nonRebasingSupply = nonRebasingSupply.sub(_amount);
        } else {
            _rebasingCredits = _rebasingCredits.sub(creditAmount);
        }

        _totalSupply = _totalSupply.sub(_amount);

        _afterTokenTransfer(_account, address(0), _amount);

        emit Transfer(_account, address(0), _amount);
    }

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

    function rebaseOptIn(address _address) public onlyPayoutManager notPaused nonReentrant {
        require(_isNonRebasingAccount(_address), "Account has not opted out");

        uint256 newCreditBalance = _creditBalances[_address]
            .mul(_rebasingCreditsPerToken)
            .div(_creditsPerToken(_address));

        nonRebasingSupply = nonRebasingSupply.sub(balanceOf(_address));

        _creditBalances[_address] = newCreditBalance;

        _rebasingCredits = _rebasingCredits.add(newCreditBalance);

        rebaseState[_address] = RebaseOptions.OptIn;

        delete nonRebasingCreditsPerToken[_address];

        _nonRebaseOwners.remove(_address);
    }

    function rebaseOptOut(address _address) public onlyPayoutManager notPaused nonReentrant {
        require(!_isNonRebasingAccount(_address), "Account has not opted in");

        nonRebasingSupply = nonRebasingSupply.add(balanceOf(_address));
        nonRebasingCreditsPerToken[_address] = _rebasingCreditsPerToken;

        _rebasingCredits = _rebasingCredits.sub(_creditBalances[_address]);

        rebaseState[_address] = RebaseOptions.OptOut;

        _nonRebaseOwners.add(_address);
    }

    function changeNegativeSupply(uint256 _newTotalSupply) external onlyExchanger {
        _rebasingCreditsPerToken = _rebasingCredits.divPrecisely(_newTotalSupply);
        require(_rebasingCreditsPerToken > 0, "Invalid change in supply");
        _totalSupply = _rebasingCredits.divPrecisely(_rebasingCreditsPerToken);
    }

    function changeSupply(uint256 _newTotalSupply)
        external
        onlyExchanger
        nonReentrant
        notPaused
        returns (NonRebaseInfo [] memory, uint256)
    {
        require(_totalSupply > 0, "Cannot increase 0 supply");
        require(_newTotalSupply >= _totalSupply, 'negative rebase');

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

        if (from == to) {
            return;
        }

        if (from == address(0)) {
            _owners.add(to);
        } else if (to == address(0)) {
            if (balanceOf(from) == 0) {
                _owners.remove(from);
            }
        } else {
            if (balanceOf(from) == 0) {
                _owners.remove(from);
            } else if (amount > 0) {
                _owners.add(to);
            }
            if (amount > 0) {
                _owners.add(to);
            }
        }
    }
}
