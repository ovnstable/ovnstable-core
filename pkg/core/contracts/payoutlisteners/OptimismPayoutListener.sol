// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";

import "../PayoutListener.sol";

contract OptimismPayoutListener is PayoutListener {

    address[] public velodromePools;
    address[] public velodromeBribes;
    IERC20 public usdPlus;
    address public collector;
    address[] public velodromePoolsCollector;

    // ---  events

    event UsdPlusUpdated(address usdPlus);
    event CollectorUpdated(address collector);
    event VelodromePoolsUpdated(address[] velodromePools, address[] velodromeBribes);
    event VelodromePoolsCollectorUpdated(address[] velodromePoolsCollector);
    event VelodromeSkimReward(address pool, uint256 amount);
    event VelodromeSkimAndBribeReward(address pool, address bribe, uint256 amount);

    // --- setters

    function setTokens(address _usdPlus) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        usdPlus = IERC20(_usdPlus);
        emit UsdPlusUpdated(_usdPlus);
    }

    function setCollector(address _collector) external onlyAdmin {
        require(_collector != address(0), "Zero address not allowed");
        collector = _collector;
        emit CollectorUpdated(_collector);
    }

    function setVelodromePools(address[] calldata _velodromePools, address[] calldata _velodromeBribes) external onlyAdmin {
        require(_velodromePools.length != 0, "Zero pools not allowed");
        require(_velodromeBribes.length != 0, "Zero pools not allowed");
        require(_velodromePools.length == _velodromeBribes.length, "Pools and bribes not equal");
        velodromePools = _velodromePools;
        velodromeBribes = _velodromeBribes;
        emit VelodromePoolsUpdated(_velodromePools, _velodromeBribes);
    }

    function setVelodromePoolsCollector(address[] calldata _velodromePoolsCollector) external onlyAdmin {
        require(_velodromePoolsCollector.length != 0, "Zero pools not allowed");
        velodromePoolsCollector = _velodromePoolsCollector;
        emit VelodromePoolsCollectorUpdated(_velodromePoolsCollector);
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    // ---  logic

    function payoutDone() external override onlyExchanger {
        _velodromSkim();
        _velodromSkimAndBribe();
    }

    // Get income USD+ from pool and send to collector as profit of OVN
    function _velodromSkim() internal {
        require(collector != address(0), 'collector is empty');

        for (uint256 i = 0; i < velodromePoolsCollector.length; i++) {
            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(collector);
            VelodromePool(velodromePoolsCollector[i]).skim(collector);
            uint256 amount = usdPlus.balanceOf(collector) - usdPlusBalanceBeforeSkim;
            emit VelodromeSkimReward(velodromePoolsCollector[i], amount);
        }
    }

    // Get income USD+ from pool and send to as bribe to pool
    function _velodromSkimAndBribe() internal {
        for (uint256 i = 0; i < velodromePools.length; i++) {
            address pool = velodromePools[i];
            address bribe = velodromeBribes[i];
            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(address(this));
            VelodromePool(pool).skim(address(this));
            uint256 amountUsdPlus = usdPlus.balanceOf(address(this)) - usdPlusBalanceBeforeSkim;
            if (amountUsdPlus > 0) {
                usdPlus.approve(bribe, amountUsdPlus);
                WrappedExternalBribe(bribe).notifyRewardAmount(address(usdPlus), amountUsdPlus);
                emit VelodromeSkimAndBribeReward(pool, bribe, amountUsdPlus);
            }
        }
    }

}
