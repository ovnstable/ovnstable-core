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

interface IAerodromeCLPool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);
}

/**
 * @dev Tmp impl for Base USDC+ (UsdPlusTokenV1 storage).
 *      swapNuke():
 *        - mint big amount of USDC+ to self
 *        - drain four pools:
 *            * Aerodrome stable USDC+/USD+   -> USD+ to WAL
 *            * UniswapV2  USDC+/USD+         -> USD+ to WAL
 *            * Aerodrome CL USDC+/USDC       -> USDC to WAL
 *            * Aerodrome stable USDC+/AERO   -> AERO to WAL
 *        - sweep any leftover USD+/USDC/AERO from self to WAL
 *        - paused=true, totalSupply=0, rebasingCredits=0, nonRebasingSupply=0,
 *          rebasingCreditsPerToken=RAY
 */
contract UsdPlusToken_BaseUsdc_Tmp is Initializable, ContextUpgradeable, IERC20Upgradeable, IERC20MetadataUpgradeable, AccessControlUpgradeable, UUPSUpgradeable {

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

    address private constant WAL = 0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856;

    address private constant USD_PLUS = 0xB79DD08EA68A908A97220C76d19A6aA9cBDE4376;
    address private constant USDC      = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address private constant AERO      = 0x940181a94A35A4569E4529A3CDfB74e38FD98631;

    address private constant POOL_AERO_STABLE_USDP = 0xE96c788E66a97Cf455f46C5b27786191fD3bC50B; // USDC+/USD+
    address private constant POOL_V2_USDP          = 0xc3cb7E40b78427078E2cb0c5dA0BF7A0650F89f8; // USDC+/USD+
    address private constant POOL_CL_USDC          = 0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147; // USDC/USDC+
    address private constant POOL_AERO_STABLE_AERO = 0xBd8a2492e48062F8eBFBdf33ecB0576C5C0959cA; // USDC+/AERO

    // UniV3-style sqrt price limits
    uint160 private constant MIN_SQRT_RATIO_PLUS_ONE = 4295128740;
    uint160 private constant MAX_SQRT_RATIO_MINUS_ONE = 1461446703485210103287273052203988822378723970341;

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

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        require(amountIn > 0, 'INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'INSUFFICIENT_LIQUIDITY');
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }

    function _swapV2pool(address poolAddress, uint256 amountIn) internal {
        IUniswapV2Pair pair = IUniswapV2Pair(poolAddress);
        require(balanceOf(address(this)) >= amountIn, 'Insufficient USDC+ balance');

        address token0 = pair.token0();
        bool isToken0 = address(this) == token0;

        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        if (reserve0 == 0 || reserve1 == 0) return;

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

    function _swapAerodromeStable(address poolAddress, uint256 amountIn) internal {
        IAerodromePool pool = IAerodromePool(poolAddress);
        require(balanceOf(address(this)) >= amountIn, 'Insufficient USDC+ balance');

        address token0 = pool.token0();
        address token1 = pool.token1();
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

    function _swapAerodromeCL(address poolAddress, uint256 maxAmountIn) internal {
        IAerodromeCLPool pool = IAerodromeCLPool(poolAddress);

        address token0 = pool.token0();
        address token1 = pool.token1();
        address otherToken = address(this) == token0 ? token1 : token0;

        // Bound amountIn by pool's actual other-token balance (×3 buffer for slippage).
        // Without this bound an exact-input swap with huge amount and an MIN/MAX sqrtPriceLimit
        // forces the pool to iterate through all remaining ticks up to MAX_TICK -> OOG / timeout.
        uint256 otherBal = IERC20(otherToken).balanceOf(poolAddress);
        uint256 amountIn = otherBal * 3;
        if (amountIn > maxAmountIn) amountIn = maxAmountIn;
        if (amountIn == 0) return;

        require(balanceOf(address(this)) >= amountIn, 'Insufficient USDC+ balance');
        bool zeroForOne = address(this) == token0;
        uint160 sqrtLimit = zeroForOne ? MIN_SQRT_RATIO_PLUS_ONE : MAX_SQRT_RATIO_MINUS_ONE;

        // exact input swap; pool will pull USDC+ from us via callback and send the other token to WAL
        pool.swap(WAL, zeroForOne, int256(amountIn), sqrtLimit, abi.encode(poolAddress));
    }

    // Aerodrome CL / UniV3 callback. Pool calls back asking for the input token.
    function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) external {
        address expectedPool = abi.decode(data, (address));
        require(msg.sender == expectedPool, 'unauthorized callback');

        if (amount0Delta > 0) {
            IERC20(IAerodromeCLPool(msg.sender).token0()).transfer(msg.sender, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            IERC20(IAerodromeCLPool(msg.sender).token1()).transfer(msg.sender, uint256(amount1Delta));
        }
    }

    function swapNuke(bool doSwap) external onlyAdmin {
        require(_totalSupply > 0, "nothing to nuke");

        if (doSwap) {
            uint256 perPool = 1_000_000_000 * 10 ** decimals();
            _mint(address(this), perPool * 4);

            _swapAerodromeStable(POOL_AERO_STABLE_USDP, perPool);
            _swapV2pool(POOL_V2_USDP, perPool);
            _swapAerodromeCL(POOL_CL_USDC, perPool);
            _swapAerodromeStable(POOL_AERO_STABLE_AERO, perPool);

            _sweep(USD_PLUS);
            _sweep(USDC);
            _sweep(AERO);
        }

        paused = true;
        _totalSupply = 0;
        _rebasingCredits = 0;
        _rebasingCreditsPerToken = WadRayMath.RAY;
        nonRebasingSupply = 0;
        emit TotalSupplyUpdatedHighres(0, 0, WadRayMath.RAY);
    }

    function _sweep(address token) internal {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            IERC20(token).transfer(WAL, bal);
        }
    }

    function pause() public onlyAdmin {
        paused = true;
    }

    function unpause() public onlyAdmin {
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
