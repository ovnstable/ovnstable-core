// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/AaveV3.sol";
import "hardhat/console.sol";


contract StrategyAave is Strategy {

    // --- params

    IERC20 public usdcToken;
    IERC20 public aUsdcToken;
    IPoolAddressesProvider public aaveProvider;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address aUsdc;
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
        usdcToken = IERC20(params.usdc);
        aUsdcToken = IERC20(params.aUsdc);
        aaveProvider = IPoolAddressesProvider(params.aaveProvider);
        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        IPool pool = IPool(aaveProvider.getPool());
        usdcToken.approve(address(pool), _amount);
        pool.deposit(address(usdcToken), _amount, address(this), 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        IPool pool = IPool(aaveProvider.getPool());
        aUsdcToken.approve(address(pool), _amount);
        return pool.withdraw(_asset, _amount, address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        IPool pool = IPool(aaveProvider.getPool());
        uint256 _amount = aUsdcToken.balanceOf(address(this));
        aUsdcToken.approve(address(pool), _amount);
        return pool.withdraw(_asset, _amount, address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + aUsdcToken.balanceOf(address(this));
    }

    function liquidationValue() external view override returns (uint256) {
        return usdcToken.balanceOf(address(this)) + aUsdcToken.balanceOf(address(this));
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {
        return 0;
    }

}
