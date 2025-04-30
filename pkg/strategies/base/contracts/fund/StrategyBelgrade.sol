// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IBelgradeStrategy.sol";


contract StrategyBelgrade is Strategy {

    // --- params

    IBelgradeStrategy public belgrade;

    IERC20 public asset;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address belgrade;
        address asset;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        require(params.belgrade != address(0), "belgrade is zero");
        require(params.asset != address(0), "asset is zero");
        belgrade = IBelgradeStrategy(params.belgrade);
        asset = IERC20(params.asset);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        asset.transfer(address(belgrade), _amount);
        belgrade.stake(address(asset), _amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        belgrade.unstake(address(asset), _amount, address(this), false);

        return asset.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        belgrade.unstake(address(asset), belgrade.netAssetValue(), address(this), false);

        return asset.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return asset.balanceOf(address(this)) + belgrade.netAssetValue();
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return belgrade.claimRewards(_beneficiary);
    }

}
