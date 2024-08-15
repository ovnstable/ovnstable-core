// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Arrakis.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

import "hardhat/console.sol";

contract StrategyArrakisDaiUsdc is Strategy {
    // --- params

    IERC20 public usdc;
    IERC20 public dai;
    IERC20 public op;

    IArrakisV1RouterStaking public arrakisRouter;
    IGauge public arrakisRewards;
    IArrakisVaultV1 public arrakisVault;

    ISwapRouter public uniswapV3Router;
    uint24 public poolUsdcOpFee;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;

    uint256 public usdcDm;
    uint256 public daiDm;

    address public curve3Pool;

    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address op;
        address arrakisRouter;
        address arrakisRewards;
        address arrakisVault;
        address uniswapV3Router;
        uint24 poolUsdcOpFee;
        address oracleUsdc;
        address oracleDai;
        address curve3Pool;
    }

    // --- events

    event StrategyUpdatedParams();

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __Strategy_init();
    }

    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        dai = IERC20(params.dai);
        op = IERC20(params.op);

        arrakisRouter = IArrakisV1RouterStaking(params.arrakisRouter);
        arrakisRewards = IGauge(params.arrakisRewards);
        arrakisVault = IArrakisVaultV1(params.arrakisVault);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolUsdcOpFee = params.poolUsdcOpFee;

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleDai = IPriceFeed(params.oracleDai);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        curve3Pool = params.curve3Pool;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        require(_asset == address(dai), "Some token not compatible");

        // 1. Calculate needed USDC to swap to DAI
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();

        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountDaiToSwap = CurveLibrary.getAmountToSwap(
            curve3Pool,
            address(dai),
            address(usdc),
            daiBalance,
            amountDaiCurrent,
            amountUsdcCurrent,
            daiDm,
            usdcDm,
            1
        );

        // 2. Swap dai to needed usdc amount
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdc(amountDaiToSwap), swapSlippageBP) - 10;
        CurveLibrary.swap(curve3Pool, address(dai), address(usdc), amountDaiToSwap, usdcMinAmount);

        // 3. Stake USDC/DAI to Arrakis
        uint256 daiAmount = dai.balanceOf(address(this));
        uint256 usdcAmount = usdc.balanceOf(address(this));
        dai.approve(address(arrakisRouter), daiAmount);
        usdc.approve(address(arrakisRouter), usdcAmount);
        arrakisRouter.addLiquidityAndStake(
            arrakisRewards,
            usdcAmount,
            daiAmount,
            OvnMath.subBasisPoints(usdcAmount, stakeSlippageBP),
            OvnMath.subBasisPoints(daiAmount, stakeSlippageBP),
            0,
            address(this)
        );
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(dai), "Some token not compatible");

        // 1. Calculating need amount lp - depends on amount USDC/DAI
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();

        uint256 totalLpBalance = arrakisVault.totalSupply();
        uint256 amountLp = CurveLibrary.getAmountLpTokens(
            curve3Pool,
            address(dai),
            address(usdc),
            OvnMath.addBasisPoints(_amount + 10, 1),
            totalLpBalance,
            amountDaiCurrent,
            amountUsdcCurrent,
            daiDm,
            usdcDm,
            1
        );
        if (amountLp > totalLpBalance) {
            amountLp = totalLpBalance;
        }
        uint256 amountUsdc = (amountUsdcCurrent * amountLp) / totalLpBalance;
        uint256 amountDai = (amountDaiCurrent * amountLp) / totalLpBalance;

        // 2. Get USDC/DAI from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(
            arrakisRewards,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            address(this)
        );

        // 3. Swap USDc to DAI
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP) - 1e13;
        CurveLibrary.swap(curve3Pool, address(usdc), address(dai), usdcBalance, daiMinAmount);

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {
        require(_asset == address(dai), "Some token not compatible");

        // 1. Get balance LP
        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        if (amountLp == 0) {
            return 0;
        }

        // 2. Calculating amount dai/usdc under lp
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault
            .getUnderlyingBalances();
        uint256 amountUsdc = (amountUsdcCurrent * amountLp) / arrakisVault.totalSupply();
        uint256 amountDai = (amountDaiCurrent * amountLp) / arrakisVault.totalSupply();

        // 3. Get dai/usdc from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(
            arrakisRewards,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            address(this)
        );

        // 4. Swap USDC to DAI
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP) - 10;
        CurveLibrary.swap(curve3Pool, address(usdc), address(dai), usdcBalance, daiMinAmount);

        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));

        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        if (amountLp > 0) {
            (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault
                .getUnderlyingBalances();
            usdcBalance += (amountUsdcCurrent * amountLp) / arrakisVault.totalSupply();
            daiBalance += (amountDaiCurrent * amountLp) / arrakisVault.totalSupply();
        }

        if (usdcBalance > 0) {
            if (nav) {
                daiBalance += _oracleUsdcToDai(usdcBalance);
            } else {
                daiBalance += CurveLibrary.getAmountOut(
                    curve3Pool,
                    address(usdc),
                    address(dai),
                    usdcBalance
                );
            }
        }

        return daiBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        // claim rewards
        if (arrakisRewards.balanceOf(address(this)) > 0) {
            arrakisRewards.claim_rewards(address(this));
        }

        // sell rewards
        uint256 daiBalanceBefore = dai.balanceOf(address(this));

        uint256 opBalance = op.balanceOf(address(this));
        if (opBalance > 0) {
            UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(op),
                address(usdc),
                address(dai),
                500, // 0.05%
                100, // 0.01%
                address(this),
                opBalance,
                0
            );
        }

        uint256 totalDai = dai.balanceOf(address(this)) - daiBalanceBefore;
        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }
}
