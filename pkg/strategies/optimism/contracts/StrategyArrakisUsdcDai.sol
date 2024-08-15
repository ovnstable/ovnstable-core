// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Arrakis.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";


contract StrategyArrakisUsdcDai is Strategy {

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

    function initialize() initializer public {
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

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdc), "Some token not compatible");

        // 1. Calculate needed USDC to swap to DAI
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 amountUsdcToSwap = CurveLibrary.getAmountToSwap(
            curve3Pool,
            address(usdc),
            address(dai),
            usdcBalance,
            amountUsdcCurrent,
            amountDaiCurrent,
            usdcDm,
            daiDm,
            1
        );

        // 2. Swap USDC to needed DAI amount
        uint256 daiMinAmount = OvnMath.subBasisPoints(_oracleUsdcToDai(amountUsdcToSwap), swapSlippageBP) - 1e13;
        CurveLibrary.swap(
            curve3Pool,
            address(usdc),
            address(dai),
            amountUsdcToSwap,
            daiMinAmount
        );

        // 3. Stake USDC/DAI to Arrakis
        uint256 usdcAmount = usdc.balanceOf(address(this));
        uint256 daiAmount = dai.balanceOf(address(this));
        usdc.approve(address(arrakisRouter), usdcAmount);
        dai.approve(address(arrakisRouter), daiAmount);
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

        require(_asset == address(usdc), "Some token not compatible");

        // 1. Calculating need amount lp - depends on amount USDC/DAI
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();
        uint256 totalLpBalance = arrakisVault.totalSupply();
        uint256 amountLp = CurveLibrary.getAmountLpTokens(
            curve3Pool,
            address(usdc),
            address(dai),
            OvnMath.addBasisPoints(_amount + 10, 1),
            totalLpBalance,
            amountUsdcCurrent,
            amountDaiCurrent,
            usdcDm,
            daiDm,
            1
        );
        if (amountLp > totalLpBalance) {
            amountLp = totalLpBalance;
        }
        uint256 amountUsdc = amountUsdcCurrent * amountLp / totalLpBalance;
        uint256 amountDai = amountDaiCurrent * amountLp / totalLpBalance;

        // 2. Get USDC/DAI from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(
            arrakisRewards,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            address(this)
        );

        // 3. Swap DAI to USDC
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP) - 10;
        CurveLibrary.swap(
            curve3Pool,
            address(dai),
            address(usdc),
            daiBalance,
            usdcMinAmount
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdc), "Some token not compatible");

        // 1. Get balance LP
        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        if (amountLp == 0) {
            return 0;
        }

        // 2. Calculating amount usdc/dai under lp
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();
        uint256 amountUsdc = amountUsdcCurrent * amountLp / arrakisVault.totalSupply();
        uint256 amountDai = amountDaiCurrent * amountLp / arrakisVault.totalSupply();

        // 3. Get usdc/dai from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(
            arrakisRewards,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            address(this)
        );

        // 4. Swap DAI to USDC
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP) - 10;
        CurveLibrary.swap(
            curve3Pool,
            address(dai),
            address(usdc),
            daiBalance,
            usdcMinAmount
        );

        return usdc.balanceOf(address(this));
    }


    function netAssetValue() external override view returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external override view returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256){
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));

        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        if (amountLp > 0) {
            (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();
            usdcBalance += amountUsdcCurrent * amountLp / arrakisVault.totalSupply();
            daiBalance += amountDaiCurrent * amountLp / arrakisVault.totalSupply();
        }

        if (daiBalance > 0) {
            if (nav) {
                usdcBalance += _oracleDaiToUsdc(daiBalance);
            } else {
                usdcBalance += CurveLibrary.getAmountOut(
                    curve3Pool,
                    address(dai),
                    address(usdc),
                    daiBalance
                );
            }
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (arrakisRewards.balanceOf(address(this)) > 0) {
            arrakisRewards.claim_rewards(address(this));
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 opBalance = op.balanceOf(address(this));
        if (opBalance > 0) {
            totalUsdc += UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(op),
                address(usdc),
                poolUsdcOpFee,
                address(this),
                opBalance,
                0
            );
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
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
