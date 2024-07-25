// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Moonwell.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";
import "hardhat/console.sol";

contract StrategyMoonwell is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address well;
        address weth;
        address mUsdc;
        address unitroller;
        address balancerVault;
        bytes32 poolIdWellWeth;
        address uniswapV3Router;
        uint24 poolFeeWethUsdc;
        address aerodromeRouter;
        address poolWellWeth;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public well;
    IERC20 public weth;
    IMToken public mUsdc;
    IUnitroller public unitroller;
    IVault public balancerVault;
    bytes32 public poolIdWellWeth;
    ISwapRouter public uniswapV3Router;
    uint24 public poolFeeWethUsdc;
    address public aerodromeRouter;
    address public poolWellWeth;

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
        require(params.usdc != address(0), 'usdc is empty');
        require(params.well != address(0), 'well is empty');
        require(params.weth != address(0), 'weth is empty');
        require(params.mUsdc != address(0), 'mUsdc is empty');
        require(params.unitroller != address(0), 'unitroller is empty');
        require(params.balancerVault != address(0), 'balancerVault is empty');
        require(params.poolIdWellWeth != "", 'poolIdWellWeth is empty');
        require(params.uniswapV3Router != address(0), 'uniswapV3Router is empty');
        require(params.poolFeeWethUsdc != 0, 'poolFeeWethUsdc is empty');
        require(params.aerodromeRouter != address(0), 'aerodromeRouter is empty');
        require(params.poolWellWeth != address(0), 'poolWellWeth is empty');

        usdc = IERC20(params.usdc);
        well = IERC20(params.well);
        weth = IERC20(params.weth);
        mUsdc = IMToken(params.mUsdc);
        unitroller = IUnitroller(params.unitroller);
        balancerVault = IVault(params.balancerVault);
        poolIdWellWeth = params.poolIdWellWeth;
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFeeWethUsdc = params.poolFeeWethUsdc;
        aerodromeRouter = params.aerodromeRouter;
        poolWellWeth = params.poolWellWeth;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        usdc.approve(address(mUsdc), _amount);
        mUsdc.mint(usdc.balanceOf(address(this)));
        console.log("-lool", usdc.balanceOf(address(this)));
        console.log("-la1", mUsdc.balanceOf(address(this)));
        console.log("-la2", mUsdc.exchangeRateStored());
        console.log("-res", mUsdc.balanceOf(address(this)) * mUsdc.exchangeRateStored() / 1e18);
        console.log("-res", mUsdc.balanceOf(address(this)) * mUsdc.exchangeRateStored() / 1e18);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        mUsdc.redeemUnderlying(_amount);
        console.log("lool", usdc.balanceOf(address(this)));
        console.log("la1", mUsdc.balanceOf(address(this)));
        console.log("la2", mUsdc.exchangeRateStored());
        console.log("res", mUsdc.balanceOf(address(this)) * mUsdc.exchangeRateStored() / 1e18);
        mUsdc.exchangeRateCurrent();
        console.log("res", mUsdc.balanceOf(address(this)) * mUsdc.exchangeRateStored() / 1e18);
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        mUsdc.redeem(mUsdc.balanceOf(address(this)));
        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return usdc.balanceOf(address(this)) + mUsdc.balanceOf(address(this)) * mUsdc.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (mUsdc.balanceOf(address(this)) > 0) {
            unitroller.claimReward();
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 wellBalance = well.balanceOf(address(this));
        if (wellBalance > 0) {
            uint256 wethBalance = AerodromeLibrary.getAmountsOut(
                aerodromeRouter,
                address(well),
                address(weth),
                poolWellWeth,
                wellBalance
            );
            if (wethBalance > 0) {
                wethBalance = AerodromeLibrary.singleSwap(
                    aerodromeRouter,
                    address(well),
                    address(weth),
                    poolWellWeth,
                    wellBalance,
                    wethBalance * 99 / 100,
                    address(this)
                );
                if (wethBalance > 0) {
                    totalUsdc += UniswapV3Library.singleSwap(
                        uniswapV3Router,
                        address(weth),
                        address(usdc),
                        poolFeeWethUsdc,
                        address(this),
                        wethBalance,
                        0
                    );
                }
            }
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
