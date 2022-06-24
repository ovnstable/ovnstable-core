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

    uint8 public constant E_MODE_CATEGORY_ID = 0;
    uint256 public constant INTEREST_RATE_MODE = 2;
    uint16 public constant REFERRAL_CODE = 0;
    uint256 constant BASIS_POINTS_FOR_STORAGE = 100; // 1%
    uint256 constant BASIS_POINTS_FOR_SLIPPAGE = 4; // 0.04%


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

        _showBalances();

        _showBalances();
        _borrowWmatic();

        _showBalances();
        _stakeDystopia();
        _showBalances();

        return 0;
    }

    function _stakeDystopia() internal {

        uint256 usdPlusAmount = usdPlus.balanceOf(address(this));
        uint256 wmaticAmount = wmatic.balanceOf(address(this));

        console.log('USD+  %s', usdPlusAmount/ 1e6);
        console.log('MATIC %s', wmaticAmount/ 1e18);

        dystRouter.addLiquidity(
            address(wmatic),
            address(usdPlus),
            false,
            wmaticAmount,
            usdPlusAmount,
            (wmaticAmount < 10000) ? 0 : OvnMath.subBasisPoints(wmaticAmount, BASIS_POINTS_FOR_SLIPPAGE),
            (usdPlusAmount < 10000) ? 0 : OvnMath.subBasisPoints(usdPlusAmount, BASIS_POINTS_FOR_SLIPPAGE),
            address(this),
            block.timestamp + 600
        );
    }

    function _borrowWmatic() internal {

        (uint256 reserveWmatic, uint256 reserveUsdPlus,) = dystVault.getReserves();

        uint256 balanceUsdPlus = usdPlus.balanceOf(address(this));

        // 1. Recalculate target amount and increese usdcStorage proportionately.
        uint256 amount = OvnMath.subBasisPoints(balanceUsdPlus - usdcStorage, BASIS_POINTS_FOR_STORAGE);
        usdcStorage = balanceUsdPlus - amount;

        (uint256 usdcCollateral, uint256 wmaticBorrow) = AaveBorrowLibrary.getCollateralAndBorrowForSupplyAndBorrow(
            balanceUsdPlus,
            reserveUsdPlus,
            reserveWmatic,
            liquidationThreshold,
            healthFactor,
            usdcDm,
            wmaticDm,
            uint256(oracleUsdc.latestAnswer()),
            uint256(oracleWmatic.latestAnswer())
        );

        IPool aavePool = _aavePool();

        usdc.approve(address(aavePool), usdcCollateral);
        aavePool.supply(address(usdc), usdcCollateral, address(this), REFERRAL_CODE);
        aavePool.borrow(address(wmatic), wmaticBorrow, INTEREST_RATE_MODE , REFERRAL_CODE, address(this));
    }

    function _aavePool() internal returns (IPool aavePool){
        aavePool = IPool(AaveBorrowLibrary.getAavePool(address(aavePoolAddressesProvider), E_MODE_CATEGORY_ID));
    }


    function _showAave() internal {

        IPool aave= _aavePool();

        ( uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor) = aave.getUserAccountData(address(this));


        console.log('---AAVE---');
        console.log('totalCollateralBase:         %s', totalCollateralBase);
        console.log('totalDebtBase:               %s', totalDebtBase);
        console.log('availableBorrowsBase:        %s', availableBorrowsBase);
        console.log('currentLiquidationThreshold: %s', currentLiquidationThreshold);
        console.log('ltv:                         %s', ltv);
        console.log('healthFactor:                %s', healthFactor);
        console.log('');

    }

    function _showBalances() internal {
        console.log('---Balances---');
        console.log('USDC     %s', usdc.balanceOf(address(this)) / 1e6);
        console.log('USD+     %s', usdPlus.balanceOf(address(this)) / 1e6);
        console.log('WMATIC   %s', wmatic.balanceOf(address(this)) / 1e18);
        console.log('Dystopia %s', dystVault.balanceOf(address(this)));
    }
}
