// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";

import "../PayoutListener.sol";

contract OptimismPayoutListener is PayoutListener {

    address[] public velodromePools;
    address[] public velodromeBribes;
    IERC20 public usdPlus;

    // ---  events

    event SkimReward(address pool, uint256 amount);

    // --- setters

    function setTokens(address _usdPlus) external onlyAdmin {
        usdPlus = IERC20(_usdPlus);
    }

    function setVelodromePools(address[] calldata _pools, address[] calldata _bribes) external onlyAdmin {
        velodromePools = _pools;
        velodromeBribes = _bribes;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    // ---  logic

    function payoutDone() external override onlyExchanger {
        for (uint256 i = 0; i < velodromePools.length; i++) {

            VelodromePool(velodromePools[i]).skim(address(this));

            uint256 amountUsdPlus = usdPlus.balanceOf(address(this));
            if(amountUsdPlus > 0) {
                usdPlus.approve(velodromeBribes[i], amountUsdPlus);
                WrappedExternalBribe(velodromeBribes[i]).notifyRewardAmount(address(usdPlus), amountUsdPlus);
                emit SkimReward(velodromePools[i], amountUsdPlus);
            }
        }
    }


}

