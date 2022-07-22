// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./core/Strategy.sol";
import "./exchanges/DystopiaExchange.sol";
import "./exchanges/BalancerExchange.sol";
import "./connectors/dystopia/interfaces/IDystopiaLP.sol";
import "./connectors/aave/interfaces/IPriceFeed.sol";
import "./connectors/penrose/interface/IUserProxy.sol";
import "./connectors/penrose/interface/IPenLens.sol";
import "./libraries/AaveBorrowLibrary.sol";
import "./interfaces/ISwapper.sol";


contract StrategyDystopiaUsdcTusd is Strategy, DystopiaExchange, BalancerExchange {

    IERC20 public usdcToken;
    IERC20 public tusdToken;
    IERC20 public dystToken;
    IERC20 public wmaticToken;

    uint256 public usdcTokenDenominator;
    uint256 public tusdTokenDenominator;

    IDystopiaLP public gauge;
    IDystopiaLP public dystPair;
    bytes32 public poolIdUsdcTusdTusdUsdt;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleTusd;

    IERC20 public penToken;
    IUserProxy public userProxy;
    IPenLens public penLens;

    ISwapper public swapper;


    // --- events

    event StrategyUpdatedTokens(address usdcToken, address usdtToken, address dystToken, address wmaticToken, address penToken,
        uint256 usdcTokenDenominator, uint256 tusdTokenDenominator);

    event StrategyUpdatedParams(address gauge, address dystPair, address dystRouter, address balancerVault, bytes32 poolIdUsdcTusdTusdUsdt,
        address oracleUsdc, address oracleTusd, address userProxy, address penLens, address swapper);


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setTokens(
        address _usdcToken,
        address _tusdToken,
        address _dystToken,
        address _wmaticToken,
        address _penToken
    ) external onlyAdmin {

        require(_usdcToken != address(0), "Zero address not allowed");
        require(_tusdToken != address(0), "Zero address not allowed");
        require(_dystToken != address(0), "Zero address not allowed");
        require(_wmaticToken != address(0), "Zero address not allowed");
        require(_penToken != address(0), "Zero address not allowed");

        usdcToken = IERC20(_usdcToken);
        tusdToken = IERC20(_tusdToken);
        dystToken = IERC20(_dystToken);
        wmaticToken = IERC20(_wmaticToken);
        penToken = IERC20(_penToken);
        usdcTokenDenominator = 10 ** IERC20Metadata(_usdcToken).decimals();
        tusdTokenDenominator = 10 ** IERC20Metadata(_tusdToken).decimals();

        emit StrategyUpdatedTokens(_usdcToken, _tusdToken, _dystToken, _wmaticToken, _penToken, usdcTokenDenominator, tusdTokenDenominator);
    }

    function setParams(
        address _gauge,
        address _dystPair,
        address _dystRouter,
        address _balancerVault,
        bytes32 _poolIdUsdcTusdTusdUsdt,
        address _oracleUsdc,
        address _oracleTusd,
        address _userProxy,
        address _penLens,
        address _swapper
    ) external onlyAdmin {

        require(_gauge != address(0), "Zero address not allowed");
        require(_dystPair != address(0), "Zero address not allowed");
        require(_dystRouter != address(0), "Zero address not allowed");
        require(_balancerVault != address(0), "Zero address not allowed");
        require(_poolIdUsdcTusdTusdUsdt != "", "Empty pool id not allowed");
        require(_oracleUsdc != address(0), "Zero address not allowed");
        require(_oracleTusd != address(0), "Zero address not allowed");
        require(_userProxy != address(0), "Zero address not allowed");
        require(_penLens != address(0), "Zero address not allowed");
        require(_swapper != address(0), "Zero address not allowed");

        gauge = IDystopiaLP(_gauge);
        dystPair = IDystopiaLP(_dystPair);
        _setDystopiaRouter(_dystRouter);
        setBalancerVault(_balancerVault);
        poolIdUsdcTusdTusdUsdt = _poolIdUsdcTusdTusdUsdt;
        oracleUsdc = IPriceFeed(_oracleUsdc);
        oracleTusd = IPriceFeed(_oracleTusd);
        userProxy = IUserProxy(_userProxy);
        penLens = IPenLens(_penLens);
        swapper = ISwapper(_swapper);

        emit StrategyUpdatedParams(_gauge, _dystPair, _dystRouter, _balancerVault, _poolIdUsdcTusdTusdUsdt, _oracleUsdc,
            _oracleTusd, _userProxy, _penLens, _swapper);
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveTusd,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveTusd > 10 ** 15, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdcToken.balanceOf(address(this));
        uint256 amountUsdcToSwap = _getAmountToken0(
            usdcBalance,
            reserveUsdc,
            reserveTusd,
            usdcTokenDenominator,
            tusdTokenDenominator,
            1,
            address(usdcToken),
            address(tusdToken)
        );

        // swap usdc to usdt
        ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
            address(usdcToken),
            address(tusdToken),
            amountUsdcToSwap,
            0,
            5
        );
        IERC20(swapParams.tokenIn).approve(address(swapper), swapParams.amountIn);
        swapper.swap(swapParams);

        // add liquidity
        usdcBalance = usdcToken.balanceOf(address(this));
        uint256 tusdBalance = tusdToken.balanceOf(address(this));

        _addLiquidity(
            address(usdcToken),
            address(tusdToken),
            usdcBalance,
            tusdBalance,
            OvnMath.subBasisPoints(usdcBalance, BASIS_POINTS_FOR_SLIPPAGE),
            OvnMath.subBasisPoints(tusdBalance, BASIS_POINTS_FOR_SLIPPAGE),
            address(this)
        );

        uint256 lpTokenBalance = dystPair.balanceOf(address(this));
        dystPair.approve(address(userProxy), lpTokenBalance);
        userProxy.depositLpAndStake(address(dystPair), lpTokenBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(usdcToken), "Some token not compatible");

        (uint256 reserveUsdc, uint256 reserveTusd,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveTusd > 10 ** 15, 'Liquidity lpToken reserves too low');

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
                reserveTusd,
                totalLpBalance
            );

            if (lpTokensToWithdraw > lpTokenBalance) {
                lpTokensToWithdraw = lpTokenBalance;
            }

            userProxy.unstakeLpAndWithdraw(address(dystPair), lpTokensToWithdraw);

            uint256 unstakedLPTokenBalance = dystPair.balanceOf(address(this));

            uint256 amountOutUsdcMin = reserveUsdc * unstakedLPTokenBalance / totalLpBalance;
            uint256 amountOutTusdMin = reserveTusd * unstakedLPTokenBalance / totalLpBalance;

            // remove liquidity
            _removeLiquidity(
                address(usdcToken),
                address(tusdToken),
                address(dystPair),
                unstakedLPTokenBalance,
                OvnMath.subBasisPoints(amountOutUsdcMin, BASIS_POINTS_FOR_SLIPPAGE),
                OvnMath.subBasisPoints(amountOutTusdMin, BASIS_POINTS_FOR_SLIPPAGE),
                address(this)
            );
        }

        // swap tusd to usdc
        uint256 tusdBalance = tusdToken.balanceOf(address(this));
        ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
            address(tusdToken),
            address(usdcToken),
            tusdBalance,
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

        (uint256 reserveUsdc, uint256 reserveTusd,) = dystPair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveTusd > 10 ** 15, 'Liquidity lpToken reserves too low');

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
            uint256 amountOutTusdMin = reserveTusd * unstakedLPTokenBalance / totalLpBalance;

            // remove liquidity
            _removeLiquidity(
                address(usdcToken),
                address(tusdToken),
                address(dystPair),
                unstakedLPTokenBalance,
                OvnMath.subBasisPoints(amountOutUsdcMin, BASIS_POINTS_FOR_SLIPPAGE),
                OvnMath.subBasisPoints(amountOutTusdMin, BASIS_POINTS_FOR_SLIPPAGE),
                address(this)
            );
        }

        // swap tusd to usdc
        uint256 tusdBalance = tusdToken.balanceOf(address(this));
        ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
            address(tusdToken),
            address(usdcToken),
            tusdBalance,
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
        uint256 tusdBalance = tusdToken.balanceOf(address(this));

        // Fetch amount of penPool LP currently staked
        address userProxyThis = penLens.userProxyByAccount(address(this));
        address stakingAddress = penLens.stakingRewardsByDystPool(address(dystPair));
        uint256 lpTokenBalance = IERC20(stakingAddress).balanceOf(userProxyThis);
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = dystPair.totalSupply();
            (uint256 reserveUsdc, uint256 reserveTusd,) = dystPair.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            tusdBalance += reserveTusd * lpTokenBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromTusd;
        if (tusdBalance > 0) {
            if (nav) {
                uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
                uint256 priceTusd = uint256(oracleTusd.latestAnswer());
                usdcBalanceFromTusd = AaveBorrowLibrary.convertTokenAmountToTokenAmount(tusdBalance, tusdTokenDenominator, usdcTokenDenominator, priceTusd, priceUsdc);
            } else {
                ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
                    address(tusdToken),
                    address(usdcToken),
                    tusdBalance,
                    0,
                    5
                );
                usdcBalanceFromTusd = swapper.getAmountOut(swapParams);
            }
        }

        return usdcBalance + usdcBalanceFromTusd;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        userProxy.claimStakingRewards();

        // sell rewards
        uint256 totalUsdc;

        uint256 dystBalance = dystToken.balanceOf(address(this));
        if (dystBalance > 0) {
            uint256 dystUsdc = _swapExactTokensForTokens(
                address(dystToken),
                address(wmaticToken),
                address(usdcToken),
                false,
                false,
                dystBalance,
                address(this)
            );
            totalUsdc += dystUsdc;
        }

        uint256 penBalance = penToken.balanceOf(address(this));
        if (penBalance > 0) {
            uint256 penUsdc = _swapExactTokensForTokens(
                address(penToken),
                address(wmaticToken),
                address(usdcToken),
                false,
                false,
                penBalance,
                address(this)
            );
            totalUsdc += penUsdc;
        }

        usdcToken.transfer(_to, usdcToken.balanceOf(address(this)));

        return totalUsdc;
    }

    /**
     * Get amount of token1 nominated in token0 where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function _getAmountToken0(
        uint256 amount0Total,
        uint256 reserve0,
        uint256 reserve1,
        uint256 denominator0,
        uint256 denominator1,
        uint256 precision,
        address token0,
        address token1
    ) internal view returns (uint256) {
        uint256 amount0 = (amount0Total * reserve1) / (reserve0 * denominator1 / denominator0 + reserve1);
        for (uint i = 0; i < precision; i++) {
            ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
                token0,
                token1,
                amount0,
                0,
                5
            );
            uint256 amount1 = swapper.getAmountOut(swapParams);
            amount0 = (amount0Total * reserve1) / (reserve0 * amount1 / amount0 + reserve1);
        }

        return amount0;
    }

    /**
     * Get amount of lp tokens where amount0Total is total getting amount nominated in token0
     *
     * precision: 0 - no correction, 1 - one correction (recommended value), 2 or more - several corrections
     */
    function _getAmountLpTokens(
        uint256 amount0Total,
        uint256 reserve0,
        uint256 reserve1,
        uint256 totalLpBalance
    ) internal view returns (uint256) {
        uint256 lpBalance = (totalLpBalance * amount0Total * tusdTokenDenominator) / (reserve0 * tusdTokenDenominator + reserve1 * usdcTokenDenominator);

        uint256 amount1 = reserve1 * lpBalance / totalLpBalance;
        ISwapper.SwapParams memory swapParams = ISwapper.SwapParams(
            address(tusdToken),
            address(usdcToken),
            amount1,
            0,
            5
        );
        uint256 amount0 = swapper.getAmountOut(swapParams);
        lpBalance = (totalLpBalance * amount0Total * amount1) / (reserve0 * amount1 + reserve1 * amount0);

        return lpBalance;
    }

}
