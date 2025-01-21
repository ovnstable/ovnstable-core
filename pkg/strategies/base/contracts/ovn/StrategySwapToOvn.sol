// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import '@overnight-contracts/core/contracts/Strategy.sol';
import '@overnight-contracts/connectors/contracts/stuff/Silo.sol';
import '@overnight-contracts/connectors/contracts/stuff/Chainlink.sol';
import '@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol';
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

import "hardhat/console.sol";

/**
 * This strategy holds OVN and on unstake swaps USD+ to OVN
 */
contract StrategySwapToOvn is Strategy {
   
    IERC20 public usdPlus;
    IERC20 public ovn;
    //uint256 public assetDm;
    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdPlus;
        address ovn;
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdPlus = IERC20(params.usdPlus);
        ovn = IERC20(params.ovn);
        //assetDm = 10 ** IERC20Metadata(params.usdc).decimals();
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
    }

    function _unstake(address _asset, uint256 _amount, address _beneficiary) internal override returns (uint256) {
        return ovn.balanceOf(address(this));
    }

    function _unstakeFull(address _asset, address _beneficiary) internal override returns (uint256) {
        if (this.netAssetValue() == 0) {
            return 0;
        }

        return ovn.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        uint256 balanceInCash = ovn.balanceOf(address(this));

        return balanceInCash;
    }

    function liquidationValue() external view override returns (uint256) {
        return this.netAssetValue();
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }
}