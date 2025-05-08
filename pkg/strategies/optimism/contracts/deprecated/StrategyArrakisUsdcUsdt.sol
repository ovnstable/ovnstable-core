// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Arrakis.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

contract StrategyArrakisUsdcUsdt is Strategy {
    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public op;

    IArrakisV1RouterStaking public arrakisRouter;
    IGauge public arrakisRewards;
    IArrakisVaultV1 public arrakisVault;

    ISwapRouter public uniswapV3Router;
    uint24 public poolUsdcOpFee;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    uint256 public usdcDm;
    uint256 public usdtDm;

    address public curve3Pool;

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address op;
        address arrakisRouter;
        address arrakisRewards;
        address arrakisVault;
        address uniswapV3Router;
        uint24 poolUsdcOpFee;
        address oracleUsdc;
        address oracleUsdt;
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
        usdt = IERC20(params.usdt);
        op = IERC20(params.op);

        arrakisRouter = IArrakisV1RouterStaking(params.arrakisRouter);
        arrakisRewards = IGauge(params.arrakisRewards);
        arrakisVault = IArrakisVaultV1(params.arrakisVault);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolUsdcOpFee = params.poolUsdcOpFee;

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        curve3Pool = params.curve3Pool;

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(address _asset, uint256 _amount) internal override {
        require(_asset == address(usdc), "Some token not compatible");

        // 1. Calculate needed USDC to swap to Usdt
        (uint256 amountUsdcCurrent, uint256 amountUsdtCurrent) = arrakisVault.getUnderlyingBalances();

        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 amountUsdcToSwap = CurveLibrary.getAmountToSwap(
            curve3Pool,
            address(usdc),
            address(usdt),
            usdcBalance,
            amountUsdcCurrent,
            amountUsdtCurrent,
            usdcDm,
            usdtDm,
            1
        );

        // 2. Swap USDC to needed Usdt amount
        uint256 usdtMinAmount = OvnMath.subBasisPoints(_oracleUsdcToUsdt(amountUsdcToSwap), swapSlippageBP) - 10;
        CurveLibrary.swap(
            curve3Pool,
            address(usdc),
            address(usdt),
            amountUsdcToSwap,
            usdtMinAmount
        );

        // 3. Stake USDC/Usdt to Arrakis
        uint256 usdcAmount = usdc.balanceOf(address(this));
        uint256 usdtAmount = usdt.balanceOf(address(this));
        usdc.approve(address(arrakisRouter), usdcAmount);
        usdt.approve(address(arrakisRouter), usdtAmount);
        arrakisRouter.addLiquidityAndStake(
            arrakisRewards,
            usdcAmount,
            usdtAmount,
            OvnMath.subBasisPoints(usdcAmount, stakeSlippageBP),
            OvnMath.subBasisPoints(usdtAmount, stakeSlippageBP),
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

        // 1. Calculating need amount lp - depends on amount USDC/Usdt
        (uint256 amountUsdcCurrent, uint256 amountUsdtCurrent) = arrakisVault.getUnderlyingBalances();

        uint256 totalLpBalance = arrakisVault.totalSupply();
        uint256 amountLp = CurveLibrary.getAmountLpTokens(
            curve3Pool,
            address(usdc),
            address(usdt),
            OvnMath.addBasisPoints(_amount + 10, 1),
            totalLpBalance,
            amountUsdcCurrent,
            amountUsdtCurrent,
            usdcDm,
            usdtDm,
            1
        );
        if (amountLp > totalLpBalance) {
            amountLp = totalLpBalance;
        }
        uint256 amountUsdc = (amountUsdcCurrent * amountLp) / totalLpBalance;
        uint256 amountUsdt = (amountUsdtCurrent * amountLp) / totalLpBalance;

        // 2. Get USDC/Usdt from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(
            arrakisRewards,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdt, stakeSlippageBP),
            address(this)
        );

        // 3. Swap Usdt to USDC
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP) - 10;

        CurveLibrary.swap(curve3Pool, address(usdt), address(usdc), usdtBalance, usdcMinAmount);

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

        // 2. Calculating amount usdc/usdt under lp
        (uint256 amountUsdcCurrent, uint256 amountUsdtCurrent) = arrakisVault
        .getUnderlyingBalances();
        uint256 amountUsdc = (amountUsdcCurrent * amountLp) / arrakisVault.totalSupply();
        uint256 amountUsdt = (amountUsdtCurrent * amountLp) / arrakisVault.totalSupply();

        // 3. Get usdc/usdt from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(
            arrakisRewards,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdt, stakeSlippageBP),
            address(this)
        );

        // 4. Swap Usdt to USDC
        uint256 usdtBalance = usdt.balanceOf(address(this));
        uint256 usdcMinAmount = OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP) - 10;
        CurveLibrary.swap(curve3Pool, address(usdt), address(usdc), usdtBalance, usdcMinAmount);

        return usdc.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        if (amountLp > 0) {
            (uint256 amountUsdcCurrent, uint256 amountUsdtCurrent) = arrakisVault
            .getUnderlyingBalances();
            usdcBalance += (amountUsdcCurrent * amountLp) / arrakisVault.totalSupply();
            usdtBalance += (amountUsdtCurrent * amountLp) / arrakisVault.totalSupply();
        }

        if (usdtBalance > 0) {
            if (nav) {
                usdcBalance += _oracleUsdtToUsdc(usdtBalance);
            } else {
                usdcBalance += CurveLibrary.getAmountOut(
                    curve3Pool,
                    address(usdt),
                    address(usdc),
                    usdtBalance
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

    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return
        ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        return
        ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }
}
