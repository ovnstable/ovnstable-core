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

interface IUniswapV3Pool {
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

interface ICurvePoolNG {
    function coins(uint256 i) external view returns (address);
    function exchange(int128 i, int128 j, uint256 _dx, uint256 _min_dy, address _receiver) external returns (uint256);
}

interface ICurvePoolLegacy {
    function coins(uint256 i) external view returns (address);
    function exchange(int128 i, int128 j, uint256 _dx, uint256 _min_dy) external returns (uint256);
}

interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey memory key, SwapParams memory params, bytes calldata hookData) external returns (int256);
    function sync(address currency) external;
    function settle() external payable returns (uint256);
    function take(address currency, address to, uint256 amount) external;
}

struct PoolKey {
    address currency0;
    address currency1;
    uint24 fee;
    int24 tickSpacing;
    address hooks;
}

struct SwapParams {
    bool zeroForOne;
    int256 amountSpecified;
    uint160 sqrtPriceLimitX96;
}

/**
 * @dev Tmp impl for Arbitrum USDT+ (UsdPlusTokenV1 storage).
 *      Per-pool admin swap methods + final nuke().
 *      Supports PancakeV3 (UniV3 callback-compat), Curve StableSwapNG / legacy,
 *      and Uniswap V4 PoolManager (requires external PoolKey).
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

    address private constant WAL = 0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856;

    address private constant POOL_PANCAKE_V3_A  = 0x8a06339Abd7499Af755DF585738ebf43D5D62B94;
    address private constant POOL_PANCAKE_V3_B  = 0xb9c2d906f94b27bC403Ab76B611D2C4490c2ae3F;
    address private constant POOL_CURVE_NG      = 0x1446999B0b0E4f7aDA6Ee73f2Ae12a2cfdc5D9E7;
    address private constant POOL_CURVE_LEGACY  = 0xd4F94D0aaa640BBb72b5EEc2D85F6D114D81a88E;
    address private constant POOL_V4_MANAGER    = 0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32;

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

    function _ensureMinted(uint256 minBalance) internal {
        uint256 bal = balanceOf(address(this));
        if (bal < minBalance) {
            _mint(address(this), minBalance - bal);
        }
    }

    function _swapUniV3(address poolAddress, uint256 maxAmountIn) internal {
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddress);

        address token0 = pool.token0();
        address token1 = pool.token1();
        address otherToken = address(this) == token0 ? token1 : token0;

        uint256 otherBal = IERC20(otherToken).balanceOf(poolAddress);
        if (otherBal == 0) return;
        uint256 amountIn = otherBal * 3;
        if (amountIn > maxAmountIn) amountIn = maxAmountIn;
        if (amountIn == 0) return;

        require(balanceOf(address(this)) >= amountIn, 'Insufficient self balance');
        bool zeroForOne = address(this) == token0;
        uint160 sqrtLimit = zeroForOne ? MIN_SQRT_RATIO_PLUS_ONE : MAX_SQRT_RATIO_MINUS_ONE;

        pool.swap(WAL, zeroForOne, int256(amountIn), sqrtLimit, abi.encode(poolAddress));
    }

    function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) external {
        address expectedPool = abi.decode(data, (address));
        require(msg.sender == expectedPool, 'unauthorized callback');

        if (amount0Delta > 0) {
            IERC20(IUniswapV3Pool(msg.sender).token0()).transfer(msg.sender, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            IERC20(IUniswapV3Pool(msg.sender).token1()).transfer(msg.sender, uint256(amount1Delta));
        }
    }

    function pancakeV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) external {
        address expectedPool = abi.decode(data, (address));
        require(msg.sender == expectedPool, 'unauthorized callback');

        if (amount0Delta > 0) {
            IERC20(IUniswapV3Pool(msg.sender).token0()).transfer(msg.sender, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            IERC20(IUniswapV3Pool(msg.sender).token1()).transfer(msg.sender, uint256(amount1Delta));
        }
    }

    function _findCoins(address poolAddress, bool isNG) internal view returns (int128 selfIdx, int128 otherIdx, address otherToken) {
        selfIdx = -1;
        otherIdx = -1;
        for (int128 i = 0; i < 8; i++) {
            address coin;
            if (isNG) {
                try ICurvePoolNG(poolAddress).coins(uint256(int256(i))) returns (address c) { coin = c; } catch { break; }
            } else {
                try ICurvePoolLegacy(poolAddress).coins(uint256(int256(i))) returns (address c) { coin = c; } catch { break; }
            }
            if (coin == address(0)) break;
            if (coin == address(this)) {
                selfIdx = i;
            } else if (otherIdx == -1) {
                otherIdx = i;
                otherToken = coin;
            }
        }
        require(selfIdx >= 0 && otherIdx >= 0, "curve coin not found");
    }

    function _swapCurve(address poolAddress, uint256 amountIn, bool isNG) internal {
        (int128 selfIdx, int128 otherIdx, address otherToken) = _findCoins(poolAddress, isNG);

        uint256 poolOtherBal = IERC20(otherToken).balanceOf(poolAddress);
        if (poolOtherBal == 0) return;

        if (amountIn > poolOtherBal * 3) amountIn = poolOtherBal * 3;
        if (amountIn == 0) return;

        require(balanceOf(address(this)) >= amountIn, 'Insufficient self balance');

        IERC20(address(this)).approve(poolAddress, amountIn);

        uint256 beforeBal = IERC20(otherToken).balanceOf(address(this));
        if (isNG) {
            ICurvePoolNG(poolAddress).exchange(selfIdx, otherIdx, amountIn, 0, address(this));
        } else {
            ICurvePoolLegacy(poolAddress).exchange(selfIdx, otherIdx, amountIn, 0);
        }
        uint256 afterBal = IERC20(otherToken).balanceOf(address(this));
        uint256 received = afterBal - beforeBal;
        if (received > 0) {
            IERC20(otherToken).transfer(WAL, received);
        }
    }

    function swapPancakeV3A(uint256 maxAmountIn) external onlyAdmin { _ensureMinted(maxAmountIn); _swapUniV3(POOL_PANCAKE_V3_A, maxAmountIn); }
    function swapPancakeV3B(uint256 maxAmountIn) external onlyAdmin { _ensureMinted(maxAmountIn); _swapUniV3(POOL_PANCAKE_V3_B, maxAmountIn); }
    function swapCurveNG(uint256 maxAmountIn) external onlyAdmin { _ensureMinted(maxAmountIn); _swapCurve(POOL_CURVE_NG, maxAmountIn, true); }
    function swapCurveLegacy(uint256 maxAmountIn) external onlyAdmin { _ensureMinted(maxAmountIn); _swapCurve(POOL_CURVE_LEGACY, maxAmountIn, false); }

    function swapV4(PoolKey calldata key, uint256 amountIn) external onlyAdmin {
        _ensureMinted(amountIn);
        bytes memory data = abi.encode(key, amountIn);
        IPoolManager(POOL_V4_MANAGER).unlock(data);
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == POOL_V4_MANAGER, "unauthorized v4 callback");

        (PoolKey memory key, uint256 amountIn) = abi.decode(data, (PoolKey, uint256));

        bool zeroForOne = key.currency0 == address(this);
        address inputCurrency = zeroForOne ? key.currency0 : key.currency1;
        address outputCurrency = zeroForOne ? key.currency1 : key.currency0;
        uint160 sqrtLimit = zeroForOne ? MIN_SQRT_RATIO_PLUS_ONE : MAX_SQRT_RATIO_MINUS_ONE;

        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: sqrtLimit
        });

        IPoolManager pm = IPoolManager(POOL_V4_MANAGER);

        pm.sync(inputCurrency);
        IERC20(inputCurrency).transfer(POOL_V4_MANAGER, amountIn);
        pm.settle();

        pm.swap(key, params, "");

        uint256 outBal = IERC20(outputCurrency).balanceOf(POOL_V4_MANAGER);
        if (outBal > 0) {
            pm.take(outputCurrency, WAL, outBal);
        }

        return "";
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
