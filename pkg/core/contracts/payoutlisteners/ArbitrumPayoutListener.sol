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

    address[] public arbiswapPools;
    address public arbiswapWallet;

    // ---  events

    event UsdPlusUpdated(address usdPlus);

    event SolidLizardPoolsUpdated(address[] pools, address[] bribes);
    event SolidLizardSkimAndBribeReward(address pool, address bribe, uint256 amount);

    event SterlingPoolsUpdated(address[] pools);
    event SterlingWalletUpdated(address wallet);
    event SterlingSkimReward(address pool, address wallet, uint256 amount);

    event ArbiswapPoolsUpdated(address[] pools);
    event ArbiswapWalletUpdated(address wallet);
    event ArbiswapSkimReward(address pool, address wallet, uint256 amount);

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

    function setArbiswapPools(address[] calldata _pools) external onlyAdmin {
        arbiswapPools = _pools;
        emit ArbiswapPoolsUpdated(_pools);
    }

    function setArbiswapWallet(address _wallet) external onlyAdmin {
        require(_wallet != address(0), "Zero address not allowed");
        arbiswapWallet = _wallet;
        emit ArbiswapWalletUpdated(_wallet);
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
        _sterlingSkim();
        _arbiswapSkim();
    }

    function _solidLizardSkimAndBribe() internal {
        for (uint256 i = 0; i < solidLizardPools.length; i++) {
            address pool = solidLizardPools[i];
//            address bribe = solidLizardBribes[i];
//            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(address(this));
            ILizardPair(pool).skim(address(this));
//            uint256 amountUsdPlus = usdPlus.balanceOf(address(this)) - usdPlusBalanceBeforeSkim;
//            if (amountUsdPlus > 0) {
//                usdPlus.approve(bribe, amountUsdPlus);
//                ILizardBribe(bribe).notifyRewardAmount(address(usdPlus), amountUsdPlus);
//                emit SolidLizardSkimAndBribeReward(pool, bribe, amountUsdPlus);
//            }
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

    function _arbiswapSkim() internal {
        for (uint256 i = 0; i < arbiswapPools.length; i++) {
            address pool = arbiswapPools[i];
            uint256 usdPlusBalanceBeforeSkim = usdPlus.balanceOf(address(this));
            IArbiswapPair(pool).skim(address(this));
            uint256 amountUsdPlus = usdPlus.balanceOf(address(this)) - usdPlusBalanceBeforeSkim;
            if (amountUsdPlus > 0) {
                usdPlus.transfer(arbiswapWallet, amountUsdPlus);
                emit ArbiswapSkimReward(pool, arbiswapWallet, amountUsdPlus);
            }
        }
    }

}