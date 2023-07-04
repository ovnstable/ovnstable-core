// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV2.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract StrategySushiswapDaiUsdc is Strategy {

    // --- params

    IERC20 public dai;
    IERC20 public usdc;
    IERC20 public weth;
    IERC20 public sushi;

    IPriceFeed public oracleDai;
    IPriceFeed public oracleUsdc;

    ISwapRouter public uniswapV3Router;
    IUniswapV2Router02 public sushiswapRouter;

    INonfungiblePositionManager public npm;
    IUniswapV3Pool public pool;
    int24 public tickLower;
    int24 public tickUpper;

    uint256 public daiDm;
    uint256 public usdcDm;

    uint256 public tokenId;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address dai;
        address usdc;
        address weth;
        address sushi;
        address oracleDai;
        address oracleUsdc;
        address uniswapV3Router;
        address sushiswapRouter;
        address npm;
        address pool;
        int24 tickLower;
        int24 tickUpper;
    }

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
        weth = IERC20(params.weth);
        sushi = IERC20(params.sushi);

        oracleDai = IPriceFeed(params.oracleDai);
        oracleUsdc = IPriceFeed(params.oracleUsdc);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        sushiswapRouter = IUniswapV2Router02(params.sushiswapRouter);

        npm = INonfungiblePositionManager(params.npm);
        pool = IUniswapV3Pool(params.pool);
        // reset tokenId if we change position
        if (tickLower != params.tickLower || tickUpper != params.tickUpper) {
            tokenId = 0;
        }
        tickLower = params.tickLower;
        tickUpper = params.tickUpper;

        daiDm = 10 ** IERC20Metadata(params.dai).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        dai.approve(address(npm), type(uint256).max);
        usdc.approve(address(npm), type(uint256).max);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap dai to usdc
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 daiAmount = _getAmountToSwap(daiBalance);
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(dai),
            address(usdc),
            100, // 0.01%
            address(this),
            daiAmount,
            OvnMath.subBasisPoints(_oracleDaiToUsdc(daiAmount), swapSlippageBP)
        );

        // add liquidity
        bool isReverse = _isReverse();
        daiBalance = dai.balanceOf(address(this));
        uint256 usdcBalance = usdc.balanceOf(address(this));
        if (tokenId == 0) {
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0 : pool.token0(),
                token1 : pool.token1(),
                fee : pool.fee(),
                tickLower : tickLower,
                tickUpper : tickUpper,
                amount0Desired : isReverse ? usdcBalance : daiBalance,
                amount1Desired : isReverse ? daiBalance : usdcBalance,
                amount0Min : 0,
                amount1Min : 0,
                recipient : address(this),
                deadline : block.timestamp
            });

            (tokenId,,,) = npm.mint(params);

        } else {
            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId : tokenId,
                amount0Desired : isReverse ? usdcBalance : daiBalance,
                amount1Desired : isReverse ? daiBalance : usdcBalance,
                amount0Min : 0,
                amount1Min : 0,
                deadline : block.timestamp
            });

            npm.increaseLiquidity(params);
        }
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // remove liquidity
        uint128 liquidityToUnstake = _getLiquidityToUnstake(_amount);

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId : tokenId,
            liquidity : liquidityToUnstake,
            amount0Min : 0,
            amount1Min : 0,
            deadline : block.timestamp
        });

        npm.decreaseLiquidity(params);

        // collect fees
        _collectFees();

        // swap usdc to dai
        uint256 usdcBalance = usdc.balanceOf(address(this));
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdc),
            address(dai),
            100, // 0.01%
            address(this),
            usdcBalance,
            OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP)
        );

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // remove liquidity
        (,,,,,,, uint128 liquidity,,,,) = npm.positions(tokenId);

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId : tokenId,
            liquidity : liquidity,
            amount0Min : 0,
            amount1Min : 0,
            deadline : block.timestamp
        });

        npm.decreaseLiquidity(params);

        // collect fees
        _collectFees();

        // swap usdc to dai
        uint256 usdcBalance = usdc.balanceOf(address(this));
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdc),
            address(dai),
            100, // 0.01%
            address(this),
            usdcBalance,
            OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP)
        );

        return dai.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 usdcBalance = usdc.balanceOf(address(this));

        if (tokenId > 0) {
            (,,,,,,, uint128 liquidity,,,,) = npm.positions(tokenId);
            if (liquidity > 0) {
                (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
                uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
                uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
                (uint256 balance0, uint256 balance1) = LiquidityAmounts.getAmountsForLiquidity(
                    sqrtRatioX96,
                    sqrtRatioAX96,
                    sqrtRatioBX96,
                    liquidity
                );
                if (_isReverse()) {
                    daiBalance += balance1;
                    usdcBalance += balance0;
                } else {
                    daiBalance += balance0;
                    usdcBalance += balance1;
                }
            }
        }

        if (usdcBalance > 0) {
            if (nav) {
                daiBalance += _oracleUsdcToDai(usdcBalance);
            } else {
                daiBalance += OvnMath.subBasisPoints(_oracleUsdcToDai(usdcBalance), swapSlippageBP);
            }
        }

        return daiBalance;
    }

    function _isReverse() internal view returns (bool) {
        return address(dai) != pool.token0();
    }

    function _getAmountToSwap(uint256 _amount) internal view returns (uint256) {
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
        bool isReverse = _isReverse();

        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtRatioX96,
            sqrtRatioAX96,
            sqrtRatioBX96,
            isReverse ? OvnMath.addBasisPoints(_oracleDaiToUsdc(_amount), swapSlippageBP) : _amount,
            isReverse ? _amount : OvnMath.addBasisPoints(_oracleDaiToUsdc(_amount), swapSlippageBP)
        );

        uint256 amount0 = uint256(SqrtPriceMath.getAmount0Delta(sqrtRatioX96, sqrtRatioBX96, int128(liquidity)));
        uint256 amount1 = uint256(SqrtPriceMath.getAmount1Delta(sqrtRatioAX96, sqrtRatioX96, int128(liquidity)));

        if (isReverse) {
            return _amount * amount0 / (amount0 + _oracleDaiToUsdc(amount1));
        } else {
            return _amount * amount1 / (amount1 + _oracleDaiToUsdc(amount0));
        }
    }

    function _getLiquidityToUnstake(uint256 _amount) internal view returns (uint128) {
        (,,,,,,,uint128 liquidity,,,,) = npm.positions(tokenId);
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
        (uint256 amount0, uint256 amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            sqrtRatioAX96,
            sqrtRatioBX96,
            liquidity
        );

        bool isReverse = _isReverse();
        uint256 usdcAmountInDai;
        if (isReverse) {
            usdcAmountInDai = _amount * amount0 / (amount0 + _oracleDaiToUsdc(amount1));
        } else {
            usdcAmountInDai = _amount * amount1 / (amount1 + _oracleDaiToUsdc(amount0));
        }

        uint128 liquidityToUnstake = LiquidityAmounts.getLiquidityForAmounts(
            sqrtRatioX96,
            sqrtRatioAX96,
            sqrtRatioBX96,
            isReverse ? OvnMath.addBasisPoints(_oracleDaiToUsdc(usdcAmountInDai), swapSlippageBP) : _amount,
            isReverse ? _amount : OvnMath.addBasisPoints(_oracleDaiToUsdc(usdcAmountInDai), swapSlippageBP)
        );

        if (liquidityToUnstake > liquidity) {
            liquidityToUnstake = liquidity;
        }

        return liquidityToUnstake;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // collect fees
        _collectFees();

        // sell rewards
        uint256 totalDai;

        uint256 sushiBalance = sushi.balanceOf(address(this));
        if (sushiBalance > 0) {
            uint256 sushiDai = UniswapV2Library.getAmountsOut(
                sushiswapRouter,
                address(sushi),
                address(weth),
                address(usdc),
                address(dai),
                sushiBalance
            );

            if (sushiDai > 0) {
                totalDai += UniswapV2Library.swapExactTokensForTokens(
                    sushiswapRouter,
                    address(sushi),
                    address(weth),
                    address(usdc),
                    address(dai),
                    sushiBalance,
                    sushiDai * 99 / 100,
                    address(this)
                );
            }
        }

        // send rewards
        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }

    function _collectFees() internal {
        if (tokenId > 0) {
            INonfungiblePositionManager.CollectParams memory collectParams = INonfungiblePositionManager.CollectParams(
                tokenId,
                address(this),
                type(uint128).max,
                type(uint128).max
            );
            npm.collect(collectParams);
        }
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }
}
