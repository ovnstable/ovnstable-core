// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IStrategy.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "../connectors/curve/interfaces/iCurvePool.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "hardhat/console.sol";
import "../interfaces/IPriceGetter.sol";
import "../connectors/aave/interfaces/ILendingPoolAddressesProvider.sol";
import "../connectors/aave/interfaces/ILendingPool.sol";


contract StrategyAave is IStrategy, AccessControlUpgradeable, UUPSUpgradeable{

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    ILendingPoolAddressesProvider public aave;

    IERC20 public usdc;
    IERC20 public aUsdc;


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }


    // --- Setters

    function setParams(address _aave,
                       address _usdc,
                       address _aUsdc
                       ) external onlyAdmin {

        require(_aave != address(0), "Zero address not allowed");
        require(_usdc != address(0), "Zero address not allowed");
        require(_aUsdc != address(0), "Zero address not allowed");

        aave = ILendingPoolAddressesProvider(_aave);

        usdc = IERC20(_usdc);
        aUsdc = IERC20(_aUsdc);
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(UPGRADER_ROLE)
    override
    {}


    // --- logic

    function stake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external {
        require(_asset == address(usdc) , "Some token not compatible" );

        address current = address(this);
        console.log("Balance usdc %s", IERC20(_asset).balanceOf(current));

        ILendingPool pool = ILendingPool(aave.getLendingPool());
        IERC20(_asset).approve(address(pool), _amount);
        pool.deposit(_asset, _amount, _beneficiary, 0);

    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) override external returns (uint256) {


    }


    function netAssetValue(address _holder) external view override returns (uint256){

        uint256 balance = aUsdc.balanceOf(_holder);
        uint256 price = 1;
        console.log('Gauge balance %s', balance);
        console.log('Gauge price %s', price);

        uint256 result = (balance / (10 ** 12)) * price;
        console.log('Gauge result %s', result);
        return  result;

    }

    function liquidationValue(address _holder) external view override returns (uint256){
        uint256 balance = aUsdc.balanceOf(_holder);
        uint256 price = 1;
        console.log('Gauge balance %s', balance);
        console.log('Gauge price %s', price);

        uint256 result = (balance / (10 ** 12)) * price;
        console.log('Gauge result %s', result);
        return  result;
    }




}
