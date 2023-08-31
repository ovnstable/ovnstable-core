// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Moonwell.sol";
import "@overnight-contracts/connectors/contracts/stuff/Balancer.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import {AerodromeLibrary} from "@overnight-contracts/connectors/contracts/stuff/Aerodrome.sol";

contract StrategyMoonwellDai is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address usdbc;
        address well;
        address weth;
        address mDai;
        address unitroller;
        address balancerVault;
        bytes32 poolIdWellWeth;
        address uniswapV3Router;
        uint24 poolFeeWethUsdbc;
        uint24 poolFeeUsdbcDai;
        address aerodromeRouter;
        address poolWellWeth;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdbc;
    IERC20 public well;
    IERC20 public weth;
    IMToken public mDai;
    IUnitroller public unitroller;
    IVault public balancerVault;
    bytes32 public poolIdWellWeth;
    ISwapRouter public uniswapV3Router;
    uint24 public poolFeeWethUsdbc;
    uint24 public poolFeeUsdbcDai;
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
        require(params.dai != address(0), 'dai is empty');
        require(params.usdbc != address(0), 'usdbc is empty');
        require(params.well != address(0), 'well is empty');
        require(params.weth != address(0), 'weth is empty');
        require(params.mDai != address(0), 'mDai is empty');
        require(params.unitroller != address(0), 'unitroller is empty');
        require(params.balancerVault != address(0), 'balancerVault is empty');
        require(params.poolIdWellWeth != "", 'poolIdWellWeth is empty');
        require(params.uniswapV3Router != address(0), 'uniswapV3Router is empty');
        require(params.poolFeeWethUsdbc != 0, 'poolFeeWethUsdbc is empty');
        require(params.poolFeeUsdbcDai != 0, 'poolFeeUsdbcDai is empty');
        require(params.aerodromeRouter != address(0), 'aerodromeRouter is empty');
        require(params.poolWellWeth != address(0), 'poolWellWeth is empty');

        dai = IERC20(params.dai);
        usdbc = IERC20(params.usdbc);
        well = IERC20(params.well);
        weth = IERC20(params.weth);
        mDai = IMToken(params.mDai);
        unitroller = IUnitroller(params.unitroller);
        balancerVault = IVault(params.balancerVault);
        poolIdWellWeth = params.poolIdWellWeth;
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFeeWethUsdbc = params.poolFeeWethUsdbc;
        poolFeeUsdbcDai = params.poolFeeUsdbcDai;
        aerodromeRouter = params.aerodromeRouter;
        poolWellWeth = params.poolWellWeth;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        dai.approve(address(mDai), _amount);
        mDai.mint(dai.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        mDai.redeemUnderlying(_amount);
        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        mDai.redeem(mDai.balanceOf(address(this)));
        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        return dai.balanceOf(address(this)) + mDai.balanceOf(address(this)) * mDai.exchangeRateStored() / 1e18;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (mDai.balanceOf(address(this)) > 0) {
            unitroller.claimReward();
        }

        // sell rewards
        uint256 totalDai;

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
                    totalDai += UniswapV3Library.multiSwap(
                        uniswapV3Router,
                        address(weth),
                        address(usdbc),
                        address(dai),
                        poolFeeWethUsdbc,
                        poolFeeUsdbcDai,
                        address(this),
                        wethBalance,
                        0
                    );
                }
            }
        }

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

}
