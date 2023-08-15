// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Moonwell.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract StrategyMoonwellUsdbc is Strategy {

    // --- structs

    struct StrategyParams {
        address usdbc;
        address well;
        address weth;
        address mUsdbc;
        address unitroller;
        address balancerVault;
        bytes32 poolIdWellWeth;
        address uniswapV3Router;
        uint24 poolFeeWethUsdbc;
    }

    // --- params

    IERC20 public usdbc;
    IERC20 public well;
    IERC20 public weth;
    IMToken public mUsdbc;
    IUnitroller public unitroller;
    IVault public balancerVault;
    bytes32 public poolIdWellWeth;
    ISwapRouter public uniswapV3Router;
    uint24 public poolFeeWethUsdbc;

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        require(params.usdbc != address(0), 'usdbc is empty');
        require(params.well != address(0), 'well is empty');
        require(params.weth != address(0), 'weth is empty');
        require(params.mUsdbc != address(0), 'mUsdbc is empty');
        require(params.unitroller != address(0), 'unitroller is empty');
        require(params.balancerVault != address(0), 'balancerVault is empty');
        require(params.poolIdWellWeth != "", 'poolIdWellWeth is empty');
        require(params.uniswapV3Router != address(0), 'uniswapV3Router is empty');
        require(params.poolFeeWethUsdbc != 0, 'poolFeeWethUsdbc is empty');

        usdbc = IERC20(params.usdbc);
        well = IERC20(params.well);
        weth = IERC20(params.weth);
        mUsdbc = IMToken(params.mUsdbc);
        unitroller = IUnitroller(params.unitroller);
        balancerVault = IVault(params.balancerVault);
        poolIdWellWeth = params.poolIdWellWeth;
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFeeWethUsdbc = params.poolFeeWethUsdbc;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        usdbc.approve(address(mUsdbc), _amount);
        mUsdbc.mint(usdbc.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        mUsdbc.redeemUnderlying(_amount);
        return usdbc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        mUsdbc.redeem(mUsdbc.balanceOf(address(this)));
        return usdbc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdbc.balanceOf(address(this)) + mUsdbc.balanceOf(address(this)) * mUsdbc.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (mUsdbc.balanceOf(address(this)) > 0) {
            unitroller.claimReward();
        }

        // sell rewards
        uint256 totalUsdbc;

        uint256 wellBalance = well.balanceOf(address(this));
        if (wellBalance > 0) {
            uint256 wethBalance = BalancerLibrary.swap(
                balancerVault,
                IVault.SwapKind.GIVEN_IN,
                address(well),
                address(weth),
                poolIdWellWeth,
                wellBalance,
                0,
                address(this),
                address(this)
            );

            if (wethBalance > 0) {
                totalUsdbc += UniswapV3Library.singleSwap(
                    uniswapV3Router,
                    address(weth),
                    address(usdbc),
                    poolFeeWethUsdbc,
                    address(this),
                    wethBalance,
                    0
                );
            }
        }

        if (totalUsdbc > 0) {
            usdbc.transfer(_to, totalUsdbc);
        }

        return totalUsdbc;
    }

}
