// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IUsdPlusToken.sol";
import "./interfaces/IExchange.sol";
import "./connectors/dystopia/interfaces/IDystopiaRouter.sol";
import "./connectors/dystopia/interfaces/IDystopiaLP.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/aave/interfaces/IPool.sol";
import "./connectors/aave/interfaces/IPoolAddressesProvider.sol";

import {AaveBorrowLibrary} from "./libraries/AaveBorrowLibrary.sol";
import {OvnMath} from "./libraries/OvnMath.sol";

import "hardhat/console.sol";

contract StrategyUsdPlusWmatic is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    uint8 public constant E_MODE_CATEGORY_ID = 1;
    uint256 public constant INTEREST_RATE_MODE = 2;
    uint16 public constant REFERRAL_CODE = 0;
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%


    // ---  fields

    IExchange public exchange;
    IUsdPlusToken public usdPlus;
    IERC20 public usdc;
    IERC20 public wmatic;

    uint256 public usdcDm;
    uint256 public wmaticDm;

    IDystopiaRouter public dystRouter;
    IDystopiaLP public dystRewards;
    IDystopiaLP public dystVault;



    // Aave
    IPoolAddressesProvider public aavePoolAddressesProvider;
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleWmatic;

    uint256 public usdcStorage;

    uint256 public liquidationThreshold;
    uint256 public healthFactor;
    uint256 public balancingDelta;
    uint256 public realHealthFactor;

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // --- Setters

    function setTokens(
        address _usdc,
        address _wmatic,
        address _usdPlus
    ) external onlyAdmin {
        usdc= IERC20(_usdc);
        wmatic= IERC20(_wmatic);
        usdcDm = 10 ** IERC20Metadata(_usdc).decimals();
        wmaticDm = 10 ** IERC20Metadata(_wmatic).decimals();

        usdPlus = IUsdPlusToken(_usdPlus);
    }

    function setParams(
        address _exchange,
        address _dystRewards,
        address _dystVault,
        address _dystRouter
    ) external onlyAdmin {

        dystRewards = IDystopiaLP(_dystRewards);
        dystVault = IDystopiaLP(_dystVault);
        dystRouter = IDystopiaRouter(_dystRouter);
        exchange = IExchange(_exchange);
    }

    function setAaveParams(
        address _aavePoolAddressesProvider,
        address _oracleUsdc,
        address _oracleWmatic,
        uint256 _liquidationThreshold,
        uint256 _healthFactor,
        uint256 _balancingDelta
    ) external onlyAdmin {

        aavePoolAddressesProvider = IPoolAddressesProvider(_aavePoolAddressesProvider);
        oracleUsdc = IPriceFeed(_oracleUsdc);
        oracleWmatic = IPriceFeed(_oracleWmatic);

        liquidationThreshold = _liquidationThreshold * 10 ** 15;
        healthFactor = _healthFactor * 10 ** 15;
        realHealthFactor = 0;
        balancingDelta = _balancingDelta * 10 ** 15;
    }

    function mint(uint256 _amount) external returns (uint256) {
        uint256 currentBalance = IERC20(address(usdPlus)).balanceOf(msg.sender);
        require(currentBalance >= _amount, "Not enough tokens to buy");

        IERC20(address(usdPlus)).transferFrom(msg.sender, address(this), _amount);

        console.log('1: USDC %s', usdc.balanceOf(address(this)) / 1e6);
        console.log('1: USD+ %s', usdPlus.balanceOf(address(this)) / 1e6);
        console.log('1: WMATIC %s', wmatic.balanceOf(address(this)) / 1e18);

        exchange.redeem(address(usdc), _amount);

        (uint256 reserve0, uint256 reserve1,) = dystVault.getReserves();

        console.log('1: WMATIC reserve0 %s', reserve0 / 1e18);
        console.log('1: USDC reserve1   %s', reserve1 / 1e6);


        // 1. Recalculate target amount and increese usdcStorage proportionately.
        uint256 amount = OvnMath.subBasisPoints(usdc.balanceOf(address(this)) - usdcStorage, BASIS_POINTS_FOR_STORAGE);
        usdcStorage = usdc.balanceOf(address(this)) - amount;

        console.log('2: USDC %s', usdc.balanceOf(address(this)) / 1e6);
        console.log('2: USD+ %s', usdPlus.balanceOf(address(this)) / 1e6);
        console.log('2: WMATIC %s', wmatic.balanceOf(address(this)) / 1e18);

        (uint256 usdcCollateral, uint256 wmaticBorrow) = AaveBorrowLibrary.getCollateralAndBorrowForSupplyAndBorrow(
            usdc.balanceOf(address(this)),
            reserve0,
            reserve1,
            liquidationThreshold,
            healthFactor,
            wmaticDm,
            usdcDm,
            uint256(oracleWmatic.latestAnswer()),
            uint256(oracleUsdc.latestAnswer())
        );

        console.log('usdcCollateral %s', usdcCollateral);
        console.log('wmaticBorrow %s', wmaticBorrow);


        IPool aavePool = _aavePool();
        usdc.approve(address(aavePool), usdcCollateral);
        aavePool.supply(address(usdc), usdcCollateral, address(this), REFERRAL_CODE);
        aavePool.borrow(address(wmatic), wmaticBorrow, INTEREST_RATE_MODE , REFERRAL_CODE, address(this));

        console.log('3: USDC %s', usdc.balanceOf(address(this)) / 1e6);
        console.log('3: USD+ %s', usdPlus.balanceOf(address(this)) / 1e6);
        console.log('3: WMATIC %s', wmatic.balanceOf(address(this)) / 1e18);

        return 0;
    }

    function _aavePool() internal returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), E_MODE_CATEGORY_ID));
    }

}
