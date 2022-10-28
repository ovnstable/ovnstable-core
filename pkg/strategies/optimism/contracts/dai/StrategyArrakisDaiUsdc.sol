// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Beethovenx.sol";
import "@overnight-contracts/connectors/contracts/stuff/Arrakis.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";


contract StrategyArrakisDaiUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address dai;
        address usdc;
        address op;
        address weth;
        address arrakisRouter;
        address arrakisRewards;
        address arrakisVault;
        address beethovenxVault;
        bytes32 beethovenxPoolIdDai;
        bytes32 beethovenxPoolIdDaiUsdtUsdc;
        bytes32 beethovenxPoolIdUsdc;
        address bbRfADai;
        address bbRfAUsdc;
        address uniswapV3Router;
        uint24 poolWethOpFee;
        uint24 poolWethDaiFee;
        address oracleDai;
        address oracleUsdc;
    }

    // --- params

    IERC20 public dai;
    IERC20 public usdc;
    IERC20 public op;
    IERC20 public weth;

    IArrakisV1RouterStaking arrakisRouter;
    IArrakisRewards arrakisRewards;
    IArrakisVault arrakisVault;

    IVault public beethovenxVault;
    bytes32 public beethovenxPoolIdDai;
    bytes32 public beethovenxPoolIdDaiUsdtUsdc;
    bytes32 public beethovenxPoolIdUsdc;
    IERC20 public bbRfADai;
    IERC20 public bbRfAUsdc;

    ISwapRouter public uniswapV3Router;
    uint24 public poolWethOpFee;
    uint24 public poolWethDaiFee;

    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdc;

    uint256 daiDm;
    uint256 usdcDm;

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
        dai = IERC20(params.dai);
        usdc = IERC20(params.usdc);
        op = IERC20(params.op);
        weth = IERC20(params.weth);

        arrakisRouter = IArrakisV1RouterStaking(params.arrakisRouter);
        arrakisRewards = IArrakisRewards(params.arrakisRewards);
        arrakisVault = IArrakisVault(params.arrakisVault);

        beethovenxVault = IVault(params.beethovenxVault);
        beethovenxPoolIdDai = params.beethovenxPoolIdDai;
        beethovenxPoolIdDaiUsdtUsdc = params.beethovenxPoolIdDaiUsdtUsdc;
        beethovenxPoolIdUsdc = params.beethovenxPoolIdUsdc;
        bbRfADai = IERC20(params.bbRfADai);
        bbRfAUsdc = IERC20(params.bbRfAUsdc);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        poolWethOpFee = params.poolWethOpFee;
        poolWethDaiFee = params.poolWethDaiFee;

        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdc = IPriceFeed(params.oracleUsdc);

        daiDm = 10 ** IERC20Metadata(params.dai).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(dai), "Some token not compatible");

        // 1. Calculate needed DAI to swap to USDC
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 amountDaiToSwap = _getAmount1InToken0(
            daiBalance,
            amountDaiCurrent,
            amountUsdcCurrent
        );

        // 2. Swap DAI to needed USDC amount
        _batchSwap(
            dai,
            bbRfADai,
            bbRfAUsdc,
            usdc,
            beethovenxPoolIdDai,
            beethovenxPoolIdDaiUsdtUsdc,
            beethovenxPoolIdUsdc,
            amountDaiToSwap
        );

        // 3. Stake DAI/USDC to Arrakis
        uint256 daiAmount = dai.balanceOf(address(this));
        uint256 usdcAmount = usdc.balanceOf(address(this));
        dai.approve(address(arrakisRouter), daiAmount);
        usdc.approve(address(arrakisRouter), usdcAmount);
        arrakisRouter.addLiquidityAndStake(
            address(arrakisRewards),
            usdcAmount,
            daiAmount,
            OvnMath.subBasisPoints(usdcAmount, 4),
            OvnMath.subBasisPoints(daiAmount, 4),
            address(this)
        );
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(dai), "Some token not compatible");

        // 1. Calculating need amount lp - depends on amount DAI/USDC
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();
        uint256 totalLpBalance = arrakisVault.totalSupply();
        uint256 amountLp = _getAmountLpTokens(
            // add 1 bp and 1e13 for unstake more than requested
            OvnMath.addBasisPoints(_amount + 1e13, 1),
            arrakisVault.totalSupply(),
            amountDaiCurrent,
            amountUsdcCurrent
        );
        if (amountLp > totalLpBalance) {
            amountLp = totalLpBalance;
        }
        uint256 amountUsdc = amountUsdcCurrent * amountLp / totalLpBalance;
        uint256 amountDai = amountDaiCurrent * amountLp / totalLpBalance;

        // 2. Get DAI/USDC from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(
            address(arrakisRewards),
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, 4),
            OvnMath.subBasisPoints(amountDai, 4),
            address(this)
        );

        // 3. Swap USDC to DAI
        _batchSwap(
            usdc,
            bbRfAUsdc,
            bbRfADai,
            dai,
            beethovenxPoolIdUsdc,
            beethovenxPoolIdDaiUsdtUsdc,
            beethovenxPoolIdDai,
            usdc.balanceOf(address(this))
        );

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
        (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();
        uint256 amountUsdc = amountUsdcCurrent * amountLp / arrakisVault.totalSupply();
        uint256 amountDai = amountDaiCurrent * amountLp / arrakisVault.totalSupply();

        // 3. Get dai/usdc from Arrakis
        arrakisRewards.approve(address(arrakisRouter), amountLp);
        arrakisRouter.removeLiquidityAndUnstake(
            address(arrakisRewards),
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, 4),
            OvnMath.subBasisPoints(amountDai, 4),
            address(this)
        );

        // 4. Swap USDC to DAI
        _batchSwap(
            usdc,
            bbRfAUsdc,
            bbRfADai,
            dai,
            beethovenxPoolIdUsdc,
            beethovenxPoolIdDaiUsdtUsdc,
            beethovenxPoolIdDai,
            usdc.balanceOf(address(this))
        );

        return dai.balanceOf(address(this));
    }


    function netAssetValue() external override view returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external override view returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256){
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcBalance = usdc.balanceOf(address(this));

        uint256 amountLp = arrakisRewards.balanceOf(address(this));
        if (amountLp > 0) {
            (uint256 amountUsdcCurrent, uint256 amountDaiCurrent) = arrakisVault.getUnderlyingBalances();
            usdcBalance += amountUsdcCurrent * amountLp / arrakisVault.totalSupply();
            daiBalance += amountDaiCurrent * amountLp / arrakisVault.totalSupply();
        }

        if (usdcBalance > 0) {
            uint256 priceDai = uint256(oracleDai.latestAnswer());
            uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
            uint256 daiBalanceInPool = ChainlinkLibrary.convertTokenToToken(usdcBalance, usdcDm, daiDm, priceUsdc, priceDai);
            if (!nav) {
                daiBalanceInPool = OvnMath.subBasisPoints(daiBalanceInPool, 1);
            }
            daiBalance += daiBalanceInPool;
        }

        return daiBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        if (arrakisRewards.balanceOf(address(this)) > 0) {
            arrakisRewards.claim_rewards(address(this));
        }

        // sell rewards
        uint256 totalDai;

        uint256 opBalance = op.balanceOf(address(this));
        if (opBalance > 0) {
            uint256 opDai = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(op),
                address(weth),
                address(dai),
                poolWethOpFee,
                poolWethDaiFee,
                address(this),
                opBalance,
                0
            );

            totalDai += opDai;
        }

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

    function _getAmount1InToken0(
        uint256 amount0Total,
        uint256 reserve0,
        uint256 reserve1
    ) internal returns (uint256 amount1InToken0) {
        amount1InToken0 = (amount0Total * reserve1) / (reserve0 * usdcDm / daiDm + reserve1);
        uint256 amount1 = _queryBatchSwap(
            dai,
            bbRfADai,
            bbRfAUsdc,
            usdc,
            beethovenxPoolIdDai,
            beethovenxPoolIdDaiUsdtUsdc,
            beethovenxPoolIdUsdc,
            amount1InToken0
        );
        amount1InToken0 = (amount0Total * reserve1) / (reserve0 * amount1 / amount1InToken0 + reserve1);
    }

    function _getAmountLpTokens(
        uint256 amount0Total,
        uint256 totalLpBalance,
        uint256 reserve0,
        uint256 reserve1
    ) internal returns (uint256 lpBalance) {
        lpBalance = (totalLpBalance * amount0Total) / (reserve0 + reserve1 * daiDm / usdcDm);
        uint256 amount1 = reserve1 * lpBalance / totalLpBalance;
        uint256 amount0 = _queryBatchSwap(
            usdc,
            bbRfAUsdc,
            bbRfADai,
            dai,
            beethovenxPoolIdUsdc,
            beethovenxPoolIdDaiUsdtUsdc,
            beethovenxPoolIdDai,
            amount1
        );
        lpBalance = (totalLpBalance * amount0Total) / (reserve0 + reserve1 * amount0 / amount1);
    }

    function _queryBatchSwap(
        IERC20 token0,
        IERC20 token1,
        IERC20 token2,
        IERC20 token3,
        bytes32 poolId0,
        bytes32 poolId1,
        bytes32 poolId2,
        uint256 amount
    ) internal returns (uint256) {

        IVault.BatchSwapStep memory batchSwap0;
        batchSwap0.poolId = poolId0;
        batchSwap0.assetInIndex = 0;
        batchSwap0.assetOutIndex = 1;
        batchSwap0.amount = amount;

        IVault.BatchSwapStep memory batchSwap1;
        batchSwap1.poolId = poolId1;
        batchSwap1.assetInIndex = 1;
        batchSwap1.assetOutIndex = 2;
        batchSwap1.amount = 0;

        IVault.BatchSwapStep memory batchSwap2;
        batchSwap2.poolId = poolId2;
        batchSwap2.assetInIndex = 2;
        batchSwap2.assetOutIndex = 3;
        batchSwap2.amount = 0;

        IVault.BatchSwapStep[] memory swaps = new IVault.BatchSwapStep[](3);
        swaps[0] = batchSwap0;
        swaps[1] = batchSwap1;
        swaps[2] = batchSwap2;

        IAsset[] memory assets = new IAsset[](4);
        assets[0] = IAsset(address(token0));
        assets[1] = IAsset(address(token1));
        assets[2] = IAsset(address(token2));
        assets[3] = IAsset(address(token3));

        IVault.FundManagement memory fundManagement;
        fundManagement.sender = address(this);
        fundManagement.fromInternalBalance = false;
        fundManagement.recipient = payable(address(this));
        fundManagement.toInternalBalance = false;

        return uint256(- beethovenxVault.queryBatchSwap(IVault.SwapKind.GIVEN_IN, swaps, assets, fundManagement)[3]);
    }

    function _batchSwap(
        IERC20 token0,
        IERC20 token1,
        IERC20 token2,
        IERC20 token3,
        bytes32 poolId0,
        bytes32 poolId1,
        bytes32 poolId2,
        uint256 amount
    ) internal returns (uint256) {

        token0.approve(address(beethovenxVault), amount);

        IVault.BatchSwapStep memory batchSwap0;
        batchSwap0.poolId = poolId0;
        batchSwap0.assetInIndex = 0;
        batchSwap0.assetOutIndex = 1;
        batchSwap0.amount = amount;

        IVault.BatchSwapStep memory batchSwap1;
        batchSwap1.poolId = poolId1;
        batchSwap1.assetInIndex = 1;
        batchSwap1.assetOutIndex = 2;
        batchSwap1.amount = 0;

        IVault.BatchSwapStep memory batchSwap2;
        batchSwap2.poolId = poolId2;
        batchSwap2.assetInIndex = 2;
        batchSwap2.assetOutIndex = 3;
        batchSwap2.amount = 0;

        IVault.BatchSwapStep[] memory swaps = new IVault.BatchSwapStep[](3);
        swaps[0] = batchSwap0;
        swaps[1] = batchSwap1;
        swaps[2] = batchSwap2;

        IAsset[] memory assets = new IAsset[](4);
        assets[0] = IAsset(address(token0));
        assets[1] = IAsset(address(token1));
        assets[2] = IAsset(address(token2));
        assets[3] = IAsset(address(token3));

        IVault.FundManagement memory fundManagement;
        fundManagement.sender = address(this);
        fundManagement.fromInternalBalance = false;
        fundManagement.recipient = payable(address(this));
        fundManagement.toInternalBalance = false;

        int256[] memory limits = new int256[](4);
        limits[0] = 1e27;

        return uint256(- beethovenxVault.batchSwap(IVault.SwapKind.GIVEN_IN, swaps, assets, fundManagement, limits, block.timestamp)[3]);
    }

}
