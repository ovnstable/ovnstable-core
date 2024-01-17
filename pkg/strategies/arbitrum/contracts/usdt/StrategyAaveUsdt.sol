// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";

contract StrategyAaveUsdt is Strategy {

    IERC20 public usdt;
    IERC20 public aUsdt;
    IPoolAddressesProvider public aaveProvider;

    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdt;
        address aUsdt;
        address aaveProvider;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdt = IERC20(params.usdt);
        aUsdt = IERC20(params.aUsdt);
        aaveProvider = IPoolAddressesProvider(params.aaveProvider);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        uint256 daiBalance = usdt.balanceOf(address(this));

        IPool pool = IPool(aaveProvider.getPool());
        usdt.approve(address(pool), daiBalance);
        pool.deposit(address(usdt), daiBalance, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        IPool pool = IPool(aaveProvider.getPool());
        aUsdt.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 _amount = aUsdt.balanceOf(address(this));

        IPool pool = IPool(aaveProvider.getPool());
        aUsdt.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return aUsdt.balanceOf(address(this)) + usdt.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return aUsdt.balanceOf(address(this)) + usdt.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        return 0;
    }

}
