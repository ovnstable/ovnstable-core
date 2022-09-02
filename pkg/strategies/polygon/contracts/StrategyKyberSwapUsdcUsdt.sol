// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";

import "@overnight-contracts/connectors/contracts/stuff/KyberSwap.sol";
import "@overnight-contracts/connectors/contracts/stuff/Synapse.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";

import "hardhat/console.sol";

contract StrategyKyberSwapUsdcUsdt is Strategy {

    IERC20 public usdcToken;
    IERC20 public usdtToken;
    IERC20 public kncToken;
    IERC20 public ldoToken;

    IBasePositionManager public basePositionManager;
    IKyberSwapElasticLM public elasticLM;
    IERC20 public reinvestmentToken;
    uint256 public pid;

    ISwap public synapseSwapRouter;
    IRouter public kyberSwapRouter;
    ISwapRouter public uniswapV3Router;

    uint24 public poolFeeUsdcUsdtInUnits;
    uint24 public poolFeeKncUsdc;
    uint24 public poolFeeLdoUsdc;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    uint256 public usdcTokenDenominator;
    uint256 public usdtTokenDenominator;

    uint256 public tokenId;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdcToken;
        address usdtToken;
        address kncToken;
        address ldoToken;
        address basePositionManager;
        address elasticLM;
        address reinvestmentToken;
        uint256 pid;
        address synapseSwapRouter;
        address kyberSwapRouter;
        address uniswapV3Router;
        uint24 poolFeeUsdcUsdtInUnits;
        uint24 poolFeeKncUsdc;
        uint24 poolFeeLdoUsdc;
        address oracleUsdc;
        address oracleUsdt;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdcToken = IERC20(params.usdcToken);
        usdtToken = IERC20(params.usdtToken);
        kncToken = IERC20(params.kncToken);
        ldoToken = IERC20(params.ldoToken);

        basePositionManager = IBasePositionManager(params.basePositionManager);
        elasticLM = IKyberSwapElasticLM(params.elasticLM);
        reinvestmentToken = IERC20(params.reinvestmentToken);
        pid = params.pid;

        synapseSwapRouter = ISwap(params.synapseSwapRouter);
        kyberSwapRouter = IRouter(params.kyberSwapRouter);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);

        poolFeeUsdcUsdtInUnits = params.poolFeeUsdcUsdtInUnits;
        poolFeeKncUsdc = params.poolFeeKncUsdc;
        poolFeeLdoUsdc = params.poolFeeLdoUsdc;

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        usdcTokenDenominator = 10 ** IERC20Metadata(params.usdcToken).decimals();
        usdtTokenDenominator = 10 ** IERC20Metadata(params.usdcToken).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 reserveUsdc = usdcToken.balanceOf(address(reinvestmentToken));
        uint256 reserveUsdt = usdtToken.balanceOf(address(reinvestmentToken));
        require(reserveUsdc > 10 ** 3 && reserveUsdt > 10 ** 3, 'Liquidity reserves too low');

        // count amount usdt to swap
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        uint256 amountUsdcFromUsdt;
        if (usdtBalance > 0) {
            amountUsdcFromUsdt = SynapseLibrary.calculateSwap(
                synapseSwapRouter,
                address(usdtToken),
                address(usdcToken),
                usdtBalance
            );
        }
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 amountUsdcToSwap = SynapseLibrary.getAmount0(
            synapseSwapRouter,
            address(usdcToken),
            address(usdtToken),
            usdcBalance - amountUsdcFromUsdt,
            reserveUsdc,
            reserveUsdt,
            usdcTokenDenominator,
            usdtTokenDenominator,
            1
        );

        // swap usdc to usdt
        SynapseLibrary.swap(
            synapseSwapRouter,
            address(usdcToken),
            address(usdtToken),
            amountUsdcToSwap
        );

        // add liquidity
        usdcBalance = usdcToken.balanceOf(address(this));
        usdtBalance = usdtToken.balanceOf(address(this));
        usdcToken.approve(address(basePositionManager), usdcBalance);
        usdtToken.approve(address(basePositionManager), usdtBalance);
        if (tokenId == 0) {
            IBasePositionManager.MintParams memory params = IBasePositionManager.MintParams({
                token0: address(usdcToken),
                token1: address(usdtToken),
                fee: poolFeeUsdcUsdtInUnits,
                //TODO find how to choose ticks
                tickLower: int24(-10),
                tickUpper: int24(10),
                ticksPrevious: [int24(-22), int24(6)],
                amount0Desired: usdcBalance,
                amount1Desired: usdtBalance,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });
            (uint256 tokenIdGen,,,) = basePositionManager.mint(params);
            tokenId = tokenIdGen;
            console.log("tokenId: %s", tokenId);
        } else {
            IBasePositionManager.IncreaseLiquidityParams memory params = IBasePositionManager.IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: usdcBalance,
                amount1Desired: usdtBalance,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });
            basePositionManager.addLiquidity(params);
        }

        // deposit lpTokens
        uint256 lpBalance = reinvestmentToken.balanceOf(address(this));
        console.log("lpBalance: %s", lpBalance);
        uint256[] memory nftIds = new uint256[](1);
        nftIds[0] = tokenId;
        uint256[] memory liqs = new uint256[](1);
        liqs[0] = lpBalance;
        IERC721(address(basePositionManager)).approve(address(elasticLM), tokenId);
        elasticLM.deposit(nftIds);
        elasticLM.join(pid, nftIds, liqs);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        uint256 reserveUsdc = usdcToken.balanceOf(address(reinvestmentToken));
        uint256 reserveUsdt = usdtToken.balanceOf(address(reinvestmentToken));
        require(reserveUsdc > 10 ** 3 && reserveUsdt > 10 ** 3, 'Liquidity reserves too low');

        (uint256 lpBalanceUser,,) = elasticLM.getUserInfo(tokenId, pid);
        if (lpBalanceUser > 0) {
            // count amount to unstake
            uint256 totalLpBalance = reinvestmentToken.totalSupply();
            uint256 lpBalanceToWithdraw = SynapseLibrary.getAmountLpTokens(
                synapseSwapRouter,
                address(usdcToken),
                address(usdtToken),
                // add 10 to _amount for smooth withdraw
                _amount + 10,
                totalLpBalance,
                reserveUsdc,
                reserveUsdt,
                usdcTokenDenominator,
                usdtTokenDenominator,
                1
            );
            if (lpBalanceToWithdraw > lpBalanceUser) {
                lpBalanceToWithdraw = lpBalanceUser;
            }

            // withdraw lpTokens
            uint256[] memory nftIds = new uint256[](1);
            nftIds[0] = tokenId;
            uint256[] memory liqs = new uint256[](1);
            liqs[0] = lpBalanceToWithdraw;
            elasticLM.exit(pid, nftIds, liqs);
            elasticLM.withdraw(nftIds);

            // remove liquidity
            uint256 amountOutUsdcMin = reserveUsdc * lpBalanceToWithdraw / totalLpBalance;
            uint256 amountOutUsdtMin = reserveUsdt * lpBalanceToWithdraw / totalLpBalance;
            reinvestmentToken.approve(address(basePositionManager), lpBalanceToWithdraw);
            IBasePositionManager.RemoveLiquidityParams memory params = IBasePositionManager.RemoveLiquidityParams({
                tokenId: tokenId,
                liquidity: uint128(lpBalanceToWithdraw),
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });
            basePositionManager.removeLiquidity(params);
        }

        // swap usdt to usdc
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        if (usdtBalance > 0) {
            uint256 amountUsdcFromUsdt = SynapseLibrary.calculateSwap(
                synapseSwapRouter,
                address(usdtToken),
                address(usdcToken),
                usdtBalance
            );

            if (amountUsdcFromUsdt > 0) {
                SynapseLibrary.swap(
                    synapseSwapRouter,
                    address(usdtToken),
                    address(usdcToken),
                    usdtBalance
                );
            }
        }

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 lpBalanceUser,,) = elasticLM.getUserInfo(tokenId, pid);
        if (lpBalanceUser > 0) {
            // withdraw lpTokens
            uint256[] memory nftIds = new uint256[](1);
            nftIds[0] = tokenId;
            uint256[] memory liqs = new uint256[](1);
            liqs[0] = lpBalanceUser;
            elasticLM.exit(pid, nftIds, liqs);
            elasticLM.withdraw(nftIds);

            // remove liquidity
            uint256 reserveUsdc = usdcToken.balanceOf(address(reinvestmentToken));
            uint256 reserveUsdt = usdtToken.balanceOf(address(reinvestmentToken));
            uint256 totalLpBalance = reinvestmentToken.totalSupply();
            uint256 amountOutUsdcMin = reserveUsdc * lpBalanceUser / totalLpBalance;
            uint256 amountOutUsdtMin = reserveUsdt * lpBalanceUser / totalLpBalance;

            reinvestmentToken.approve(address(basePositionManager), lpBalanceUser);
            IBasePositionManager.RemoveLiquidityParams memory params = IBasePositionManager.RemoveLiquidityParams({
                tokenId: tokenId,
                liquidity: uint128(lpBalanceUser),
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });
            basePositionManager.removeLiquidity(params);
        }

        // swap usdt to usdc
        uint256 usdtBalance = usdtToken.balanceOf(address(this));
        if (usdtBalance > 0) {
            uint256 amountUsdcFromUsdt = SynapseLibrary.calculateSwap(
                synapseSwapRouter,
                address(usdtToken),
                address(usdcToken),
                usdtBalance
            );

            if (amountUsdcFromUsdt > 0) {
                SynapseLibrary.swap(
                    synapseSwapRouter,
                    address(usdtToken),
                    address(usdcToken),
                    usdtBalance
                );
            }
        }

        return usdcToken.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 usdtBalance = usdtToken.balanceOf(address(this));

        if (tokenId > 0) {
            (uint256 lpBalance,,) = elasticLM.getUserInfo(tokenId, pid);
            if (lpBalance > 0) {
                uint256 totalLpBalance = reinvestmentToken.totalSupply();
                uint256 reserveUsdc = usdcToken.balanceOf(address(reinvestmentToken));
                uint256 reserveUsdt = usdtToken.balanceOf(address(reinvestmentToken));
                usdcBalance += reserveUsdc * lpBalance / totalLpBalance;
                usdtBalance += reserveUsdt * lpBalance / totalLpBalance;
            }
        }

        uint256 usdcBalanceFromUsdt;
        if (usdtBalance > 0) {
            if (nav) {
                uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
                uint256 priceUsdt = uint256(oracleUsdt.latestAnswer());
                usdcBalanceFromUsdt = (usdtBalance * usdcTokenDenominator * priceUsdt) / (usdtTokenDenominator * priceUsdc);
            } else {
                usdcBalanceFromUsdt = SynapseLibrary.calculateSwap(
                    synapseSwapRouter,
                    address(usdtToken),
                    address(usdcToken),
                    usdtBalance
                );
            }
        }

        return usdcBalance + usdcBalanceFromUsdt;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        (uint256 lpBalance,,) = elasticLM.getUserInfo(tokenId, pid);
        if (lpBalance > 0) {
            uint256[] memory nftIds = new uint256[](1);
            nftIds[0] = tokenId;
            bytes[] memory datas = new bytes[](1);
            datas[0] = abi.encode(pid);
            elasticLM.harvestMultiplePools(nftIds, datas);
        }

        // sell rewards
        uint256 totalUsdc;

        uint256 kncBalance = kncToken.balanceOf(address(this));
        if (kncBalance > 0) {
            uint256 kncUsdc = KyberSwapLibrary.singleSwap(
                kyberSwapRouter,
                address(kncToken),
                address(usdcToken),
                poolFeeKncUsdc,
                address(this),
                kncBalance,
                0
            );

            totalUsdc += kncUsdc;
        }

        uint256 ldoBalance = ldoToken.balanceOf(address(this));
        if (ldoBalance > 0) {
            uint256 ldoUsdc = UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(ldoToken),
                address(usdcToken),
                poolFeeLdoUsdc,
                address(this),
                ldoBalance,
                0
            );

            totalUsdc += ldoUsdc;
        }

        if (totalUsdc > 0) {
            usdcToken.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
