// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract StrategySushiswapUsdcUsdt is Strategy {

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    ISwapRouter public uniswapV3Router;

    INonfungiblePositionManager public npm;
    IUniswapV3Pool public pool;
    int24 public tickLower;
    int24 public tickUpper;

    uint256 public usdcDm;
    uint256 public usdtDm;

    uint256 public tokenId;

    // --- events

    event StrategyUpdatedParams();

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address oracleUsdc;
        address oracleUsdt;
        address uniswapV3Router;
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
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);

        npm = INonfungiblePositionManager(params.npm);
        pool = IUniswapV3Pool(params.pool);
        tickLower = params.tickLower;
        tickUpper = params.tickUpper;

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        usdc.approve(address(npm), type(uint256).max);
        usdt.approve(address(npm), type(uint256).max);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap usdc to usdt
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdcAmount = _getAmountToSwap(usdcBalance);
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdc),
            address(usdt),
            100, // 0.01%
            address(this),
            usdcAmount,
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdcAmount), swapSlippageBP)
        );

        bool isReverse = _isReverse();

        usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));
        if (tokenId == 0) {
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0 : pool.token0(),
                token1 : pool.token1(),
                fee : pool.fee(),
                tickLower : tickLower,
                tickUpper : tickUpper,
                amount0Desired : isReverse ? usdtBalance : usdcBalance,
                amount1Desired : isReverse ? usdcBalance : usdtBalance,
                amount0Min : 0,
                amount1Min : 0,
                recipient : address(this),
                deadline : block.timestamp
            });

            (tokenId,,,) = npm.mint(params);

        } else {
            INonfungiblePositionManager.IncreaseLiquidityParams memory params = INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId : tokenId,
                amount0Desired : isReverse ? usdtBalance : usdcBalance,
                amount1Desired : isReverse ? usdcBalance : usdtBalance,
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

        uint128 liquidityToUnstake = _getLiquidityToUnstake(_amount);

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId : tokenId,
            liquidity : liquidityToUnstake,
            amount0Min : 0,
            amount1Min : 0,
            deadline : block.timestamp
        });

        npm.decreaseLiquidity(params);

        //TODO need it?
        _collectFees();

        // swap usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdt),
            address(usdc),
            100, // 0.01%
            address(this),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        (,,,,,,, uint128 liquidity,,,,) = npm.positions(tokenId);

        INonfungiblePositionManager.DecreaseLiquidityParams memory params = INonfungiblePositionManager.DecreaseLiquidityParams({
            tokenId : tokenId,
            liquidity : liquidity,
            amount0Min : 0,
            amount1Min : 0,
            deadline : block.timestamp
        });

        npm.decreaseLiquidity(params);

        //TODO need it?
        _collectFees();

        // swap usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(usdt),
            address(usdc),
            100, // 0.01%
            address(this),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );

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

        if (tokenId > 0) {
            (,,,,,,, uint128 liquidity,,,,) = npm.positions(tokenId);
            if (liquidity > 0) {
                (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
                uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
                uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
                (uint256 balance0, uint256 balance1) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);
                if (_isReverse()) {
                    usdcBalance += balance1;
                    usdtBalance += balance0;
                } else {
                    usdcBalance += balance0;
                    usdtBalance += balance1;
                }
            }
        }

        if (usdtBalance > 0) {
            if (nav) {
                usdcBalance += _oracleUsdtToUsdc(usdtBalance);
            } else {
                usdcBalance += OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP);
            }
        }

        return usdcBalance;
    }

    function _isReverse() internal view returns (bool) {
        return address(usdc) != pool.token0();
    }

    function _getAmountToSwap(uint256 _amount) internal view returns (uint256) {
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        uint160 sa = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sb = TickMath.getSqrtRatioAtTick(tickUpper);
        bool isReverse = _isReverse();
        uint256 maxPrice = 10 * _amount;
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtRatioX96,
            sa,
            sb,
            isReverse ? OvnMath.addBasisPoints(_oracleUsdcToUsdt(_amount), swapSlippageBP) : maxPrice,
            isReverse ? maxPrice : OvnMath.addBasisPoints(_oracleUsdcToUsdt(_amount), swapSlippageBP)
        );
        uint256 amount0 = uint256(SqrtPriceMath.getAmount0Delta(sqrtRatioX96, sb, int128(liquidity)));
        uint256 amount1 = uint256(SqrtPriceMath.getAmount1Delta(sa, sqrtRatioX96, int128(liquidity)));

        if (isReverse) {
            return _amount * amount1 / (amount1 + _oracleUsdcToUsdt(amount0));            
        } else {
            return _amount * amount0 / (amount0 + _oracleUsdcToUsdt(amount1));
        }
    }

    function _getLiquidityToUnstake(uint256 _amount) internal view returns (uint128) {
        (,,,,,,,uint128 liquidity,,,,) = npm.positions(tokenId);
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        uint160 sqrtRatioAX96 = TickMath.getSqrtRatioAtTick(tickLower);
        uint160 sqrtRatioBX96 = TickMath.getSqrtRatioAtTick(tickUpper);
        (uint256 amount0, uint256 amount1) = LiquidityAmounts.getAmountsForLiquidity(sqrtRatioX96, sqrtRatioAX96, sqrtRatioBX96, liquidity);

        bool isReverse = _isReverse();
        uint256 usdcAmount;
        if (isReverse) {
            usdcAmount = _amount * amount1 / (amount1 + _oracleUsdcToUsdt(amount0));
        } else {
            usdcAmount = _amount * amount0 / (amount0 + _oracleUsdcToUsdt(amount1));
        }
        uint256 maxPrice = 10 * _amount;
        uint128 liquidityToUnstake = LiquidityAmounts.getLiquidityForAmounts(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            isReverse ? OvnMath.addBasisPoints(_oracleUsdcToUsdt(usdcAmount), swapSlippageBP) : maxPrice,
            isReverse ? maxPrice : OvnMath.addBasisPoints(_oracleUsdcToUsdt(usdcAmount), swapSlippageBP)
        );

        if (liquidityToUnstake > liquidity) {
            liquidityToUnstake = liquidity;
        }

        return liquidityToUnstake;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        _collectFees();
        //TODO need stake or sell?
        _stake(address(usdc), 0);
        return 0;
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

    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }
}
