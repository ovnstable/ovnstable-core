// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";

contract StrategyAaveDai is Strategy {

    IERC20 public dai;
    IERC20 public aDai;
    IPoolAddressesProvider public aaveProvider;

    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address dai;
        address aDai;
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
        dai = IERC20(params.dai);
        aDai = IERC20(params.aDai);
        aaveProvider = IPoolAddressesProvider(params.aaveProvider);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        uint256 daiBalance = dai.balanceOf(address(this));

        IPool pool = IPool(aaveProvider.getPool());
        dai.approve(address(pool), daiBalance);
        pool.deposit(address(dai), daiBalance, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        IPool pool = IPool(aaveProvider.getPool());
        aDai.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 _amount = aDai.balanceOf(address(this));

        IPool pool = IPool(aaveProvider.getPool());
        aDai.approve(address(pool), _amount);
        uint256 withdrawAmount = pool.withdraw(_asset, _amount, address(this));

        return withdrawAmount;
    }

    function netAssetValue() external view override returns (uint256) {
        return aDai.balanceOf(address(this)) + dai.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return aDai.balanceOf(address(this)) + dai.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        return 0;
    }

}
