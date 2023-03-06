// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../PayoutListener.sol";
import "@overnight-contracts/connectors/contracts/stuff/SolidLizard.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sterling.sol";
import "@overnight-contracts/connectors/contracts/stuff/Arbiswap.sol";

contract ArbitrumPayoutListener is PayoutListener {

    IERC20 public usdPlus;
    
    address[] public solidLizardPools;
    address[] public solidLizardBribes;

    address[] public sterlingPools;
    address public sterlingWallet;

    address[] public arbiswapPools; // not using
    address public arbiswapWallet; // not using

    address public rewardWallet;

    BribeAmount[] public solidLizardBribesAmounts;

    uint256 public nextPayoutTime;
    uint256 public payoutPeriod;
    uint256 public payoutTimeRange;

    // ---  structs

    struct BribeAmount {
        address bribe;
        uint256 amount;
    }

    // ---  events

    event UsdPlusUpdated(address usdPlus);

    event SolidLizardPoolsUpdated(address[] pools, address[] bribes);
    event SolidLizardSkimAndBribeReward(address pool, address bribe, uint256 amount);
    event SolidLizardBribeReward(address bribe, uint256 amount);

    event SterlingPoolsUpdated(address[] pools);
    event SterlingWalletUpdated(address wallet);
    event SterlingSkimReward(address pool, address wallet, uint256 amount);

    event RewardWalletUpdated(address wallet);

    event PayoutTimesUpdated(uint256 nextPayoutTime, uint256 payoutPeriod, uint256 payoutTimeRange);
    event NextPayoutTime(uint256 nextPayoutTime);

    // --- setters

    function setUsdPlus(address _usdPlus) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        usdPlus = IERC20(_usdPlus);
        emit UsdPlusUpdated(_usdPlus);
    }

    function setSolidLizardPools(address[] calldata _pools, address[] calldata _bribes) external onlyAdmin {
        require(_pools.length == _bribes.length, "Pools and bribes not equal");
        solidLizardPools = _pools;
        solidLizardBribes = _bribes;
        emit SolidLizardPoolsUpdated(_pools, _bribes);
    }

    function setSterlingPools(address[] calldata _pools) external onlyAdmin {
        sterlingPools = _pools;
        emit SterlingPoolsUpdated(_pools);
    }

    function setSterlingWallet(address _wallet) external onlyAdmin {
        require(_wallet != address(0), "Zero address not allowed");
        sterlingWallet = _wallet;
        emit SterlingWalletUpdated(_wallet);
    }

    function setRewardWallet(address _wallet) external onlyAdmin {
        require(_wallet != address(0), "Zero address not allowed");
        rewardWallet = _wallet;
        emit RewardWalletUpdated(_wallet);
    }

    function setPayoutTimes(
        uint256 _nextPayoutTime,
        uint256 _payoutPeriod,
        uint256 _payoutTimeRange
    ) external onlyAdmin {
        require(_nextPayoutTime != 0, "Zero _nextPayoutTime not allowed");
        require(_payoutPeriod != 0, "Zero _payoutPeriod not allowed");
        require(_nextPayoutTime > _payoutTimeRange, "_nextPayoutTime shoud be more than _payoutTimeRange");
        nextPayoutTime = _nextPayoutTime;
        payoutPeriod = _payoutPeriod;
        payoutTimeRange = _payoutTimeRange;
        emit PayoutTimesUpdated(nextPayoutTime, payoutPeriod, payoutTimeRange);
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();

        nextPayoutTime = 1678233600; // GMT: Wednesday, 8 March 2023 y., 0:00:00
        payoutPeriod = 7 * 24 * 60 * 60; // 7 days
        payoutTimeRange = 15 * 60; // 15 min
    }

    // ---  logic

    function payoutDone() external override onlyExchanger {
        _solidLizardSkim();
        _sterlingSkim();
        _solidLizardBribe();
        _sendToRewardWallet();
    }

    function _solidLizardSkim() internal {
        for (uint256 i = 0; i < solidLizardPools.length; i++) {
            address pool = solidLizardPools[i];
            address bribe = solidLizardBribes[i];
            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(address(this));
            ILizardPair(pool).skim(address(this));
            uint256 amountUsdPlus = usdPlus.balanceOf(address(this)) - usdPlusBalanceBeforeSkim;
            if (amountUsdPlus > 0) {
                bool isFound;
                for (uint256 j = 0; j < solidLizardBribesAmounts.length; j++) {
                    if (solidLizardBribesAmounts[j].bribe == bribe) {
                        solidLizardBribesAmounts[j].amount += amountUsdPlus;
                        isFound = true;
                        break;
                    }
                }
                if (!isFound) {
                    solidLizardBribesAmounts[solidLizardBribesAmounts.length] = BribeAmount(bribe, amountUsdPlus);
                }
                emit SolidLizardSkimAndBribeReward(pool, bribe, amountUsdPlus);
            }
        }
    }

    function _sterlingSkim() internal {
        uint256 totalAmountUsdPlus;
        for (uint256 i = 0; i < sterlingPools.length; i++) {
            address pool = sterlingPools[i];
            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(address(this));
            ISterlingPair(pool).skim(address(this));
            uint256 amountUsdPlus = usdPlus.balanceOf(address(this)) - usdPlusBalanceBeforeSkim;
            if (amountUsdPlus > 0) {
                totalAmountUsdPlus += amountUsdPlus;
                emit SterlingSkimReward(pool, sterlingWallet, amountUsdPlus);
            }
        }

        if (totalAmountUsdPlus > 0) {
            usdPlus.transfer(sterlingWallet, totalAmountUsdPlus);
        }
    }

    function _solidLizardBribe() internal {
        if (block.timestamp + payoutTimeRange < nextPayoutTime) {
            return;
        }

        for (uint256 i = 0; i < solidLizardBribesAmounts.length; i++) {
            address bribe = solidLizardBribesAmounts[i].bribe;
            uint256 amount = solidLizardBribesAmounts[i].amount;
            if (amount > 0) {
                usdPlus.approve(bribe, amount);
                ILizardBribe(bribe).notifyRewardAmount(address(usdPlus), amount);
                emit SolidLizardBribeReward(bribe, amount);
            }
        }

        delete solidLizardBribesAmounts;

        for (; block.timestamp >= nextPayoutTime - payoutTimeRange;) {
            nextPayoutTime = nextPayoutTime + payoutPeriod;
        }
        emit NextPayoutTime(nextPayoutTime);
    }

    function _sendToRewardWallet() internal {
        uint256 totalBribeUsdPlus;
        for (uint256 i = 0; i < solidLizardBribesAmounts.length; i++) {
            totalBribeUsdPlus += solidLizardBribesAmounts[i].amount;
        }

        uint256 delta = usdPlus.balanceOf(address(this)) - totalBribeUsdPlus;
        if (delta > 0) {
            usdPlus.transfer(rewardWallet, delta);
        }
    }
}