// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/IDiamondStrategy.sol";

contract StrategyWrapperDiamond is Strategy {

    // --- params

    IERC20 public asset;
    IDiamondStrategy public strategy;

    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address asset;
        address diamondStrategy;
    }


    // --- constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        asset = IERC20(params.asset);
        strategy = IDiamondStrategy(params.diamondStrategy);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        asset.approve(address(strategy), _amount);
        strategy.mint(_amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        strategy.redeem(_amount);
        return asset.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        strategy.redeem(strategy.totalSupply());
        return asset.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return asset.balanceOf(address(this)) + strategy.totalSupply();
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
