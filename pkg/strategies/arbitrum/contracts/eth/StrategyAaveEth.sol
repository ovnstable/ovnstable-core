// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";

contract StrategyAaveEth is Strategy {

    // --- params

    IERC20 public eth;
    IERC20 public aEth;
    IPoolAddressesProvider public aaveProvider;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address eth;
        address aEth;
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
        eth = IERC20(params.eth);
        aEth = IERC20(params.aEth);
        aaveProvider = IPoolAddressesProvider(params.aaveProvider);
        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(eth), "Some token not compatible");

        IPool pool = IPool(aaveProvider.getPool());
        eth.approve(address(pool), _amount);
        pool.deposit(address(eth), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(eth), "Some token not compatible");

        IPool pool = IPool(aaveProvider.getPool());
        aEth.approve(address(pool), _amount);
        return pool.withdraw(_asset, _amount, address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(eth), "Some token not compatible");

        IPool pool = IPool(aaveProvider.getPool());
        uint256 _amount = aEth.balanceOf(address(this));
        aEth.approve(address(pool), _amount);
        return pool.withdraw(_asset, _amount, address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return eth.balanceOf(address(this)) + aEth.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return eth.balanceOf(address(this)) + aEth.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
