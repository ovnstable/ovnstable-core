// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Vesper.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "hardhat/console.sol";

contract StrategyVesperUsdc is Strategy {

    IERC20 public usdcToken;
    IERC20 public opToken;
    
    IVesperPool public vUsdc;
    IPoolRewards public poolRewards;

    ISwapRouter public uniswapV3Router;
    uint24 public poolFee;

    uint256 public vUsdcDecimals;


    // --- events
    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdcToken;
        address opToken;
        address vUsdc;
        address poolRewards;
        address uniswapV3Router;
        uint24 poolFee;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdcToken = IERC20(params.usdcToken);
        opToken = IERC20(params.opToken);
        vUsdc = IVesperPool(params.vUsdc);
        poolRewards = IPoolRewards(params.poolRewards);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolFee = params.poolFee;

        vUsdcDecimals = 10 ** IERC20Metadata(params.vUsdc).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        usdcToken.approve(address(vUsdc), usdcBalance);
        vUsdc.deposit(usdcBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // add stakeSlippageBP
        uint256 shares = OvnMath.addBasisPoints(_amount, stakeSlippageBP) * vUsdcDecimals / vUsdc.pricePerShare();
        if (shares > 0) {
            vUsdc.withdraw(shares);
        }

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 shares = vUsdc.balanceOf(address(this));
        if (shares > 0) {
            vUsdc.withdraw(shares);
        }

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue();
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue();
    }

    function _totalValue() internal view returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 usdcShares = vUsdc.balanceOf(address(this)) * vUsdc.pricePerShare() / vUsdcDecimals;

        return usdcBalance + usdcShares;
    }

    function _claimRewards(address _beneficiary) internal override returns (uint256) {

        // claim rewards - rewards get when withdraw
        uint256 shares = vUsdc.balanceOf(address(this));
        if (shares > 0) {
            poolRewards.claimReward(address(this));
        }

        uint256 totalUsdc;

        uint256 opBalance = opToken.balanceOf(address(this));
        if (opBalance > 0) {
            totalUsdc += UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(opToken),
                address(usdcToken),
                poolFee,
                address(this),
                opBalance,
                0
            );
        }

        if (totalUsdc > 0) {
            usdcToken.transfer(_beneficiary, totalUsdc);
        }

        return totalUsdc;
    }

}
