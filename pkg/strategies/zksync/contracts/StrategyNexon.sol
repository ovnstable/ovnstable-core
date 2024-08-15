// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Nexon.sol";

contract StrategyNexon is Strategy {

    // --- params

    IERC20 public usdc;
    NexonToken public nUsdc;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address nUsdc;
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
        nUsdc = NexonToken(params.nUsdc);
        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        usdc.approve(address(nUsdc), _amount);
        nUsdc.mint(_amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        nUsdc.redeemUnderlying(_amount);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        nUsdc.redeem(nUsdc.balanceOf(address(this)));
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return 0;
    }

    function liquidationValue() external view override returns (uint256) {
        return 0;
    }

    function _totalValue() internal view returns (uint256) {
        return usdc.balanceOf(address(this)) + nUsdc.balanceOf(address(this)) * nUsdc.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
