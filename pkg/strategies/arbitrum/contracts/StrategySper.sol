// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/core/contracts/interfaces/ISperStrategy.sol";


contract StrategyEts is Strategy {

    // --- params

    ISperStrategy public sper;

    IERC20 public asset;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address sper;
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
        require(params.sper != address(0), "rebaseToken is zero");
        require(params.asset != address(0), "asset is zero");
        sper = ISperStrategy(params.sper);
        asset = IERC20(params.asset);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        asset.transfer(address(sper), _amount);
        sper.stake(address(asset), _amount);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        sper.unstake(address(asset), _amount, address(this), false);

        return asset.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        sper.unstake(address(asset), sper.netAssetValue(), address(this), false);

        return asset.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return asset.balanceOf(address(this)) + sper.netAssetValue();
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return sper.claimRewards(_beneficiary);
    }

}
