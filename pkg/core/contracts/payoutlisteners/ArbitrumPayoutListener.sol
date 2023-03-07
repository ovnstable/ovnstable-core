// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../PayoutListener.sol";
import "@overnight-contracts/connectors/contracts/stuff/SolidLizard.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sterling.sol";
import "@overnight-contracts/connectors/contracts/stuff/Arbiswap.sol";

contract ArbitrumPayoutListener is PayoutListener {

    IERC20 public usdPlus;

    address[] public solidLizardPools;
    address[] public solidLizardBribes; // not used

    address[] public sterlingPools;
    address public sterlingWallet;

    address[] public arbiswapPools; // not used
    address public arbiswapWallet; // not used

    address public rewardWallet;

    // ---  events

    event UsdPlusUpdated(address usdPlus);
    event RewardWalletUpdated(address wallet);
    event RewardWalletSend(uint256 amount);

    event SolidLizardPoolsUpdated(address[] pools);

    event SterlingPoolsUpdated(address[] pools);
    event SterlingWalletUpdated(address wallet);
    event SterlingSkimReward(address pool, address wallet, uint256 amount);

    // --- setters

    function setUsdPlus(address _usdPlus) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
        usdPlus = IERC20(_usdPlus);
        emit UsdPlusUpdated(_usdPlus);
    }

    function setSolidLizardPools(address[] calldata _pools) external onlyAdmin {
        solidLizardPools = _pools;
        emit SolidLizardPoolsUpdated(_pools );
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


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    // ---  logic

    function payoutDone() external override onlyExchanger {
        _solidLizardSkim();
        _sterlingSkim();
        _sendToRewardWallet();
    }


    // Skim all USD+ tokens and transfer to SolidLizard staker for accumulation
    function _solidLizardSkim() internal {
        for (uint256 i = 0; i < solidLizardPools.length; i++) {
            address pool = solidLizardPools[i];
            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(address(this));
            ILizardPair(pool).skim(address(this));
        }
    }

    function _sterlingSkim() internal {
        for (uint256 i = 0; i < sterlingPools.length; i++) {
            address pool = sterlingPools[i];
            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(address(this));
            ISterlingPair(pool).skim(address(this));
            uint256 amountUsdPlus = usdPlus.balanceOf(address(this)) - usdPlusBalanceBeforeSkim;
            if (amountUsdPlus > 0) {
                usdPlus.transfer(sterlingWallet, amountUsdPlus);
                emit SterlingSkimReward(pool, sterlingWallet, amountUsdPlus);
            }
        }
    }

    function _sendToRewardWallet() internal {
        require(rewardWallet != address(0), "rewardWallet is zero");
        uint256 balance = usdPlus.balanceOf(address(this));
        if (balance > 0) {
            usdPlus.transfer(rewardWallet, balance);
            emit RewardWalletSend(balance);
        }
    }

}
