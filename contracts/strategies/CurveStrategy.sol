// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IStrategy.sol";
import "../connectors/ConnectorAAVE.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../connectors/ConnectorCurve.sol";
import "../connectors/curve/interfaces/IRewardOnlyGauge.sol";
import "hardhat/console.sol";

contract CurveStrategy is IStrategy, AccessControlUpgradeable, UUPSUpgradeable{

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    ConnectorAAVE public aave;
    ConnectorCurve public curve;
    IRewardOnlyGauge public rewardGauge;

    IERC20 public aUsdc;
    IERC20 public a3CrvToken;
    IERC20 public a3CrvGaugeToken;


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }


    // --- Setters

    function setParams(address _aave,
                       address _curve,
                       address _rewardGauge,
                       address _aUsdc,
                       address _a3CrvToken,
                       address _a3CrvGaugeToken) external onlyAdmin {

        require(_rewardGauge != address(0), "Zero address not allowed");
        require(_aave != address(0), "Zero address not allowed");
        require(_curve != address(0), "Zero address not allowed");
        require(_aUsdc != address(0), "Zero address not allowed");
        require(_a3CrvToken != address(0), "Zero address not allowed");
        require(_a3CrvGaugeToken != address(0), "Zero address not allowed");

        rewardGauge = IRewardOnlyGauge(_rewardGauge);
        aave = ConnectorAAVE(_aave);
        curve = ConnectorCurve(_curve);

        aUsdc = IERC20(_aUsdc);
        a3CrvToken = IERC20(_a3CrvToken);
        a3CrvGaugeToken = IERC20(_a3CrvGaugeToken);
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
        address _beneficiar
    ) override external {

        address current = address(this);

        console.log("Balance usdc %s", IERC20(_asset).balanceOf(current));

        aave.stake(_asset, _amount, current);

        aUsdc.transfer(address(curve), _amount);
        curve.stake(address(aUsdc), _amount, current);

        uint256 a3CrvBalance = a3CrvToken.balanceOf(current);
        a3CrvToken.approve(address(rewardGauge), a3CrvBalance);
        rewardGauge.deposit(a3CrvBalance, current, false);

        console.log("Balance a3CrvGauge %s", a3CrvGaugeToken.balanceOf(current));

        a3CrvGaugeToken.transfer(_beneficiar, a3CrvGaugeToken.balanceOf(current));

        console.log("Balance a3CrvGauge %s", a3CrvGaugeToken.balanceOf(current));
    }

    function unstake(
        address _asset,
        uint256 _amount,
        address _to
    ) override external returns (uint256) {


    }

    function balance(
        address _holder
    ) external returns (uint256){


    }

}
