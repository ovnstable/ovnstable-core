// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";

contract StrategyUsdc is Strategy {

    // --- params

    IERC20 public usdc;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        return _amount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return usdc.balanceOf(address(this));
    }


    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
