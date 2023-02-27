// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../PayoutListener.sol";
import "@overnight-contracts/connectors/contracts/stuff/SolidLizard.sol";

contract ArbitrumPayoutListener is PayoutListener {

    IERC20 public usdPlus;
    
    address[] public solidLizardPools;
    address[] public solidLizardBribes;

    // ---  events

    event UsdPlusUpdated(address usdPlus);
    event SolidLizardPoolsUpdated(address[] solidLizardPools, address[] solidLizardBribes);
    event SolidLizardSkimAndBribeReward(address pool, address bribe, uint256 amount);

    // --- setters

    function setUsdPlus(address _usdPlus) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        usdPlus = IERC20(_usdPlus);
        emit UsdPlusUpdated(_usdPlus);
    }

    function setSolidLizardPools(address[] calldata _solidLizardPools, address[] calldata _solidLizardBribes) external onlyAdmin {
        require(_solidLizardPools.length != 0, "Zero pools not allowed");
        require(_solidLizardBribes.length != 0, "Zero pools not allowed");
        require(_solidLizardPools.length == _solidLizardBribes.length, "Pools and bribes not equal");
        solidLizardPools = _solidLizardPools;
        solidLizardBribes = _solidLizardBribes;
        emit SolidLizardPoolsUpdated(_solidLizardPools, _solidLizardBribes);
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    // ---  logic

    function payoutDone() external override onlyExchanger {
        _solidLizardSkimAndBribe();
    }

    function _solidLizardSkimAndBribe() internal {
        for (uint256 i = 0; i < solidLizardPools.length; i++) {
            address pool = solidLizardPools[i];
            address bribe = solidLizardBribes[i];
            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(address(this));
            ILizardPair(pool).skim(address(this));
            uint256 amountUsdPlus = usdPlus.balanceOf(address(this)) - usdPlusBalanceBeforeSkim;
            if (amountUsdPlus > 0) {
                usdPlus.approve(bribe, amountUsdPlus);
                ILizardBribe(bribe).notifyRewardAmount(address(usdPlus), amountUsdPlus);
                emit SolidLizardSkimAndBribeReward(pool, bribe, amountUsdPlus);
            }
        }
    }

}