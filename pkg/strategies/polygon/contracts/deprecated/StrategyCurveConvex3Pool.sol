// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";
// import "@overnight-contracts/connectors/contracts/stuff/Convex.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Synapse.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";


contract StrategyCurveConvex3Pool is Strategy {

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public dai;
    IERC20 public crv;
    IERC20 public wmatic;

    IERC20 public lpToken;
    IStableSwapPool public pool;
    IBooster public booster;
    // IConvexRewardPool public rewardPool;
    uint256 public pid;

    ISwapRouter public uniswapV3Router;
    ISwap public synapseSwap;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;
    IPriceFeed public oracleDai;

    uint256 public usdcDm;
    uint256 public usdtDm;
    uint256 public daiDm;


    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address dai;
        address crv;
        address wmatic;
        address lpToken;
        address pool;
        address booster;
        address rewardPool;
        uint256 pid;
        address uniswapV3Router;
        address synapseSwap;
        address oracleUsdc;
        address oracleUsdt;
        address oracleDai;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {

        require(params.usdc != address(0), "Zero address not allowed");
        require(params.usdt != address(0), "Zero address not allowed");
        require(params.dai != address(0), "Zero address not allowed");
        require(params.crv != address(0), "Zero address not allowed");
        require(params.wmatic != address(0), "Zero address not allowed");
        require(params.lpToken != address(0), "Zero address not allowed");
        require(params.pool != address(0), "Zero address not allowed");
        require(params.booster != address(0), "Zero address not allowed");
        require(params.rewardPool != address(0), "Zero address not allowed");
        require(params.pid != 0, "Zero not allowed");
        require(params.uniswapV3Router != address(0), "Zero address not allowed");
        require(params.synapseSwap != address(0), "Zero address not allowed");
        require(params.oracleUsdc != address(0), "Zero address not allowed");
        require(params.oracleUsdt != address(0), "Zero address not allowed");
        require(params.oracleDai != address(0), "Zero address not allowed");

        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        dai = IERC20(params.dai);
        crv = IERC20(params.crv);
        wmatic = IERC20(params.wmatic);

        lpToken = IERC20(params.lpToken);
        pool = IStableSwapPool(params.pool);
        booster = IBooster(params.booster);
        // rewardPool = IConvexRewardPool(params.rewardPool);
        pid = params.pid;

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        synapseSwap = ISwap(params.synapseSwap);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);
        oracleDai = IPriceFeed(params.oracleDai);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap tokens
        (uint256 amountUsdtInUsdc, uint256 amountDaiInUsdc) = _getAmountToSwap(_amount);
        _swapFromUsdc(amountUsdtInUsdc, amountDaiInUsdc);

        // add liquidity
        uint256[3] memory amounts;
        for (uint256 i = 0; i < 3; i++) {
            address coin = pool.underlying_coins(i);
            amounts[i] = IERC20(coin).balanceOf(address(this));
            IERC20(coin).approve(address(pool), amounts[i]);
        }
        uint256 lpTokenMinAmount = OvnMath.subBasisPoints(pool.calc_token_amount(amounts, true), stakeSlippageBP);
        pool.add_liquidity(amounts, lpTokenMinAmount, true);

        // stake to Convex
        uint256 lpTokenBalance = lpToken.balanceOf(address(this));
        lpToken.approve(address(booster), lpTokenBalance);
        booster.deposit(pid, lpTokenBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        uint256 amountLpTokens = _getAmountLpTokens(OvnMath.addBasisPoints(_amount, swapSlippageBP));

        // unstake from Convex
        // rewardPool.withdraw(amountLpTokens, false);

        // remove liquidity
        uint256 lpTokenBalance = lpToken.balanceOf(address(this));
        uint256 lpTokenTotal = lpToken.totalSupply();
        uint256[3] memory min_amounts;
        for (uint256 i = 0; i < 3; i++) {
            uint256 balance = pool.balances(i);
            min_amounts[i] = OvnMath.subBasisPoints(balance * lpTokenBalance / lpTokenTotal, stakeSlippageBP);
        }
        pool.remove_liquidity(lpTokenBalance, min_amounts, true);

        // swap tokens
        _swapToUsdc(usdt.balanceOf(address(this)), dai.balanceOf(address(this)));

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // get amount to unstake
        // uint256 amountLpTokens = rewardPool.balanceOf(address(this));

        // unstake from Convex
        // rewardPool.withdraw(amountLpTokens, false);

        // remove liquidity
        uint256 lpTokenBalance = lpToken.balanceOf(address(this));
        uint256 lpTokenTotal = lpToken.totalSupply();
        uint256[3] memory min_amounts;
        for (uint256 i = 0; i < 3; i++) {
            uint256 balance = pool.balances(i);
            min_amounts[i] = OvnMath.subBasisPoints(balance * lpTokenBalance / lpTokenTotal, stakeSlippageBP);
        }
        pool.remove_liquidity(lpTokenBalance, min_amounts, true);

        // swap tokens
        _swapToUsdc(usdt.balanceOf(address(this)), dai.balanceOf(address(this)));

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
        uint256 daiBalance = dai.balanceOf(address(this));
        uint256 lpTokenTotal = lpToken.totalSupply();
        uint256 lpTokenBalance = 0; // rewardPool.balanceOf(address(this));

        for (uint256 i = 0; i < 3; i++) {
            address coin = pool.underlying_coins(i);
            uint256 balance = pool.balances(i);
            if (coin == address(usdc)) {
                usdcBalance += balance * lpTokenBalance / lpTokenTotal;
            } else if (coin == address(usdt)) {
                usdtBalance += balance * lpTokenBalance / lpTokenTotal;
            } else if (coin == address(dai)) {
                daiBalance += balance * lpTokenBalance / lpTokenTotal;
            }
        }
        
        usdcBalance += _oracleUsdtToUsdc(usdtBalance);
        usdcBalance += _oracleDaiToUsdc(daiBalance);

        if (!nav) {
            usdcBalance = OvnMath.subBasisPoints(usdcBalance, swapSlippageBP);
        }

        return usdcBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        // if (rewardPool.balanceOf(address(this)) > 0) {
            // rewardPool.getReward(address(this));
        // }

        // sell rewards
        uint256 totalUsdc;

        uint256 crvBalance = crv.balanceOf(address(this));
        if (crvBalance > 0) {
            uint256 crvUsdc = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(crv),
                address(wmatic),
                address(usdc),
                3000,
                500,
                address(this),
                crvBalance,
                0
            );
            totalUsdc += crvUsdc;
        }

        // send rewards
        if (totalUsdc > 0) {
            usdc.transfer(_to, usdc.balanceOf(address(this)));
        }

        return totalUsdc;
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

    function _oracleDaiToUsdc(uint256 daiAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(daiAmount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceDai = ChainlinkLibrary.getPrice(oracleDai);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, daiDm, priceUsdc, priceDai);
    }

    function _getAmountToSwap(uint256 amountUsdcTotal) internal view returns (uint256 amountUsdtInUsdc, uint256 amountDaiInUsdc) {

        uint256 reserveUsdc;
        uint256 reserveUsdt;
        uint256 reserveDai;
        for (uint256 i = 0; i < 3; i++) {
            address coin = pool.underlying_coins(i);
            uint256 balance = pool.balances(i);
            if (coin == address(usdc)) {
                reserveUsdc = balance;
            } else if (coin == address(usdt)) {
                reserveUsdt = balance;
            } else if (coin == address(dai)) {
                reserveDai = balance;
            }
        }

        uint256 amountUsdcUsdt = _oracleUsdcToUsdt(usdcDm);
        uint256 amountUsdcDai = _oracleUsdcToDai(usdcDm);
        amountUsdtInUsdc = (amountUsdcTotal * reserveUsdt) / (reserveUsdc * amountUsdcUsdt / usdcDm
                + reserveUsdt + reserveDai * amountUsdcUsdt / amountUsdcDai);
        amountDaiInUsdc = (amountUsdcTotal * reserveDai) / (reserveUsdc * amountUsdcDai / usdcDm
                + reserveUsdt * amountUsdcDai / amountUsdcUsdt + reserveDai);
    }

    function _getAmountLpTokens(uint256 amountUsdcTotal) internal view returns (uint256 amountLpTokens) {

        uint256 reserveUsdc;
        uint256 reserveUsdt;
        uint256 reserveDai;
        for (uint256 i = 0; i < 3; i++) {
            address coin = pool.underlying_coins(i);
            uint256 balance = pool.balances(i);
            if (coin == address(usdc)) {
                reserveUsdc = balance;
            } else if (coin == address(usdt)) {
                reserveUsdt = balance;
            } else if (coin == address(dai)) {
                reserveDai = balance;
            }
        }

        uint256 totalAmountLpTokens = lpToken.totalSupply();

        uint256 amountUsdtUsdc = _oracleUsdtToUsdc(usdtDm);
        uint256 amountDaiUsdc = _oracleDaiToUsdc(daiDm);
        amountLpTokens = (totalAmountLpTokens * amountUsdcTotal) / (reserveUsdc
                + reserveUsdt * amountUsdtUsdc / usdtDm + reserveDai * amountDaiUsdc / daiDm);
    }

    function _swapFromUsdc(uint256 amountUsdtInUsdc, uint256 amountDaiInUsdc) internal {

        if (amountUsdtInUsdc > 0) {
            SynapseLibrary.swap(
                synapseSwap,
                address(usdc),
                address(usdt),
                amountUsdtInUsdc,
                OvnMath.subBasisPoints(_oracleUsdcToUsdt(amountUsdtInUsdc), swapSlippageBP)
            );
        }

        if (amountDaiInUsdc > 0) {
            SynapseLibrary.swap(
                synapseSwap,
                address(usdc),
                address(dai),
                amountDaiInUsdc,
                OvnMath.subBasisPoints(_oracleUsdcToDai(amountDaiInUsdc), swapSlippageBP)
            );
        }
    }

    function _swapToUsdc(uint256 amountUsdt, uint256 amountDai) internal {

        if (amountUsdt > 0) {
            SynapseLibrary.swap(
                synapseSwap,
                address(usdt),
                address(usdc),
                amountUsdt,
                OvnMath.subBasisPoints(_oracleUsdtToUsdc(amountUsdt), swapSlippageBP)
            );
        }

        if (amountDai > 0) {
            SynapseLibrary.swap(
                synapseSwap,
                address(dai),
                address(usdc),
                amountDai,
                OvnMath.subBasisPoints(_oracleDaiToUsdc(amountDai), swapSlippageBP)
            );
        }
    }
}
