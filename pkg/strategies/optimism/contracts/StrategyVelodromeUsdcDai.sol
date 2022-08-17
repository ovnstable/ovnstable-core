// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "./libraries/OvnMath.sol";
import "./libraries/UniswapV3Library.sol";
import "./connectors/uniswap/v3/libraries/LiquidityAmounts.sol";
import "./connectors/uniswap/v3/interfaces/IUniswapV3Pool.sol";
import "./connectors/velodrome/interfaces/IRouter.sol";
import "./connectors/velodrome/interfaces/IGauge.sol";
import "./connectors/velodrome/interfaces/IPair.sol";
import "./connectors/chainlink/interfaces/IPriceFeed.sol";

import "hardhat/console.sol";

contract StrategyVelodromeUsdcDai is Strategy {
    using OvnMath for uint256;

    uint160 internal constant MIN_SQRT_RATIO = 79188560314459151373725315960; // TickMath.getSqrtRatioAtTick(-10)
    uint160 internal constant MAX_SQRT_RATIO = 79267784519130042428790663799; // TickMath.getSqrtRatioAtTick(10)

    IERC20 public usdcToken;
    IERC20 public daiToken;
    IERC20 public wethToken;
    IERC20 public veloToken;

    uint256 public usdcTokenDenominator;
    uint256 public daiTokenDenominator;

    IRouter public router;
    IGauge public gauge;
    IPair public pair;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;

    IUniswapV3Pool public uniswapV3PoolUsdcDai;
    address public uniswapV3Router;
    uint24 public poolFee0;
    uint24 public poolFee1;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdcToken;
        address daiToken;
        address wethToken;
        address veloToken;
        address router;
        address gauge;
        address pair;
        address oracleUsdc;
        address oracleDai;
        address uniswapV3PoolUsdcDai;
        address uniswapV3Router;
        uint24 poolFee0;
        uint24 poolFee1;
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
        daiToken = IERC20(params.daiToken);
        wethToken = IERC20(params.wethToken);
        veloToken = IERC20(params.veloToken);

        usdcTokenDenominator = 10 ** IERC20Metadata(params.usdcToken).decimals();
        daiTokenDenominator = 10 ** IERC20Metadata(params.daiToken).decimals();

        router = IRouter(params.router);
        gauge = IGauge(params.gauge);
        pair = IPair(params.pair);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleDai = IPriceFeed(params.oracleDai);

        uniswapV3PoolUsdcDai = IUniswapV3Pool(params.uniswapV3PoolUsdcDai);
        uniswapV3Router = params.uniswapV3Router;
        poolFee0 = params.poolFee0;
        poolFee1 = params.poolFee1;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveDai,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');

        // get amount to swap
        uint256 usdcBalance = usdcToken.balanceOf(address(this));

        (uint160 sqrtPriceX96,,,,,,) = uniswapV3PoolUsdcDai.slot0();
        (uint256 amountLiq0, uint256 amountLiq1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtPriceX96,
            MIN_SQRT_RATIO,
            MAX_SQRT_RATIO,
            uniswapV3PoolUsdcDai.liquidity()
        );

        uint256 needUsdtValue = (_amount * amountLiq1) / (amountLiq0 + amountLiq1);
        uint256 amountUsdcToSwap = _getAmountToken0(
            usdcBalance,
            reserveUsdc,
            reserveDai,
            usdcTokenDenominator,
            daiTokenDenominator,
            1,
            address(usdcToken),
            address(daiToken)
        );

        // swap usdc to dai
        ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
            address(usdcToken),
            address(daiToken),
            amountUsdcToSwap,
            0,
            5
        );
        IERC20(swapParams.tokenIn).approve(address(swapper), swapParams.amountIn);
        swapper.swap(swapParams);

        // add liquidity
        usdcBalance = usdcToken.balanceOf(address(this));
        uint256 daiBalance = daiToken.balanceOf(address(this));
        usdcToken.approve(address(router), usdcBalance);
        daiToken.approve(address(router), daiBalance);
        router.addLiquidity(
            address(usdcToken),
            address(daiToken),
            true,
            usdcBalance,
            daiBalance,
            usdcBalance.subBasisPoints(4, 1e4),
            daiBalance.subBasisPoints(4, 1e4),
            address(this),
            block.timestamp
        );

        // deposit
        uint256 lpTokenBalance = pair.balanceOf(address(this));
        pair.approve(address(gauge), lpTokenBalance);
        gauge.deposit(lpTokenBalance, 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveDai,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');

        // Fetch amount of penPool LP currently staked
        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystPair));
        uint256 lpTokenBalance = IERC20(stakingAddress).balanceOf(userProxyThis);

        if (lpTokenBalance > 0) {
            // count amount to unstake
            uint256 totalLpBalance = dystPair.totalSupply();
            uint256 lpTokensToWithdraw = _getAmountLpTokens(
                OvnMath.addBasisPoints(_amount, BASIS_POINTS_FOR_SLIPPAGE) + 10,
                reserveUsdc,
                reserveDai,
                totalLpBalance
            );

            if (lpTokensToWithdraw > lpTokenBalance) {
                lpTokensToWithdraw = lpTokenBalance;
            }

            userProxy.unstakeLpAndWithdraw(address(dystPair), lpTokensToWithdraw);

            uint256 unstakedLPTokenBalance = dystPair.balanceOf(address(this));

            uint256 amountOutUsdcMin = reserveUsdc * unstakedLPTokenBalance / totalLpBalance;
            uint256 amountOutDaiMin = reserveDai * unstakedLPTokenBalance / totalLpBalance;

            // remove liquidity
            _removeLiquidity(
                address(usdcToken),
                address(daiToken),
                address(dystPair),
                unstakedLPTokenBalance,
                OvnMath.subBasisPoints(amountOutUsdcMin, BASIS_POINTS_FOR_SLIPPAGE),
                OvnMath.subBasisPoints(amountOutDaiMin, BASIS_POINTS_FOR_SLIPPAGE),
                address(this)
            );
        }

        // swap dai to usdc
        uint256 daiBalance = daiToken.balanceOf(address(this));
        ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
            address(daiToken),
            address(usdcToken),
            daiBalance,
            0,
            5
        );

        IERC20(swapParams.tokenIn).approve(address(swapper), swapParams.amountIn);
        swapper.swap(swapParams);

        return usdcToken.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveDai,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');

        // Fetch amount of penPool LP currently staked
        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystPair));
        uint256 lpTokenBalance = IERC20(stakingAddress).balanceOf(userProxyThis);
        if (lpTokenBalance == 0) {
            return 0;
        }

        userProxy.unstakeLpAndWithdraw(address(dystPair), lpTokenBalance);

        uint256 unstakedLPTokenBalance = dystPair.balanceOf(address(this));
        if (unstakedLPTokenBalance > 0) {
            uint256 totalLpBalance = dystPair.totalSupply();
            uint256 amountOutUsdcMin = reserveUsdc * unstakedLPTokenBalance / totalLpBalance;
            uint256 amountOutDaiMin = reserveDai * unstakedLPTokenBalance / totalLpBalance;

            // remove liquidity
            _removeLiquidity(
                address(usdcToken),
                address(daiToken),
                address(dystPair),
                unstakedLPTokenBalance,
                OvnMath.subBasisPoints(amountOutUsdcMin, BASIS_POINTS_FOR_SLIPPAGE),
                OvnMath.subBasisPoints(amountOutDaiMin, BASIS_POINTS_FOR_SLIPPAGE),
                address(this)
            );
        }

        // swap dai to usdc
        uint256 daiBalance = daiToken.balanceOf(address(this));
        ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
            address(daiToken),
            address(usdcToken),
            daiBalance,
            0,
            5
        );
        IERC20(swapParams.tokenIn).approve(address(swapper), swapParams.amountIn);
        swapper.swap(swapParams);

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
        uint256 daiBalance = daiToken.balanceOf(address(this));

        address lpTokenBalance = gauge.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveUsdc, uint256 reserveDai,) = pair.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            daiBalance += reserveDai * lpTokenBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromDai;
        if (daiBalance > 0) {
            if (nav) {
                uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
                uint256 priceDai = uint256(oracleDai.latestAnswer());
                usdcBalanceFromDai = AaveBorrowLibrary.convertTokenAmountToTokenAmount(daiBalance, daiTokenDenominator, usdcTokenDenominator, priceDai, priceUsdc);
            } else {
                //TODO
                usdcBalanceFromDai = swapper.getAmountOut(swapParams);
            }
        }

        return usdcBalance + usdcBalanceFromDai;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        address[] memory tokens = new address[](1);
        tokens[0] = address(veloToken);
        gauge.getReward(address(this), tokens);

        // sell rewards
        uint256 totalUsdc;

        uint256 veloBalance = veloToken.balanceOf(address(this));
        if (veloBalance > 0) {
            uint256 veloUsdc = UniswapV3Library._uniswapV3InputMultihopSwap(
                uniswapV3Router,
                address(veloToken),
                address(wethToken),
                address(usdcToken),
                poolFee0,
                poolFee1,
                veloBalance,
                0,
                address(this)
            );

            totalUsdc += veloUsdc;
        }

        if (totalUsdc > 0) {
            usdcToken.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

}
