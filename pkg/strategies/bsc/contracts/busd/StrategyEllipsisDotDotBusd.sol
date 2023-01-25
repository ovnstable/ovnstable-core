// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Ellipsis.sol";
import "@overnight-contracts/connectors/contracts/stuff/DotDot.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";

import "hardhat/console.sol";

contract StrategyEllipsisDotDotBusd is Strategy {

    // --- structs

    struct StrategyParams {
        address busd;
        address usdc;
        address usdt;
        address wBnb;
        address ddd;
        address epx;
        address valas;
        address val3EPS;
        address sexVal3EPS;
        address valBusd;
        address valUsdc;
        address valUsdt;
        address pool;
        address lpDepositor;
        address pancakeRouter;
        address wombatRouter;
        address wombatPool;
        address oracleBusd;
        address oracleUsdc;
        address oracleUsdt;
    }

    // --- params

    IERC20 public busd;
    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public wBnb;
    IERC20 public ddd;
    IERC20 public epx;
    IERC20 public valas;

    IERC20 public val3EPS;
    IERC20 public sexVal3EPS;

    IAToken public valBusd;
    IAToken public valUsdc;
    IAToken public valUsdt;

    IEllipsisPool public pool;
    ILpDepositor public lpDepositor;

    IPancakeRouter02 public pancakeRouter;

    IWombatRouter public wombatRouter;
    address public wombatPool;

    IPriceFeed public oracleBusd;
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    uint256 public busdDm;
    uint256 public usdcDm;
    uint256 public usdtDm;
    uint256 public val3EPSDm;
    uint256 public valBusdDm;
    uint256 public valUsdcDm;
    uint256 public valUsdtDm;

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
        busd = IERC20(params.busd);
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        wBnb = IERC20(params.wBnb);
        ddd = IERC20(params.ddd);
        epx = IERC20(params.epx);
        valas = IERC20(params.valas);

        val3EPS = IERC20(params.val3EPS);
        sexVal3EPS = IERC20(params.sexVal3EPS);

        valBusd = IAToken(params.valBusd);
        valUsdc = IAToken(params.valUsdc);
        valUsdt = IAToken(params.valUsdt);

        pool = IEllipsisPool(params.pool);
        lpDepositor = ILpDepositor(params.lpDepositor);

        pancakeRouter = IPancakeRouter02(params.pancakeRouter);

        wombatRouter = IWombatRouter(params.wombatRouter);
        wombatPool = params.wombatPool;

        oracleBusd = IPriceFeed(params.oracleBusd);
        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        busdDm = 10 ** IERC20Metadata(params.busd).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();
        val3EPSDm = 10 ** IERC20Metadata(params.val3EPS).decimals();
        valBusdDm = 10 ** IERC20Metadata(params.valBusd).decimals();
        valUsdcDm = 10 ** IERC20Metadata(params.valUsdc).decimals();
        valUsdtDm = 10 ** IERC20Metadata(params.valUsdt).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(busd), "Some token not compatible");
        console.log("_stake");

        // calculate amount to stake
        WombatLibrary.CalculateParams memory params;
        params.wombatRouter = wombatRouter;
        params.token0 = address(busd);
        params.token1 = address(usdc);
        params.token2 = address(usdt);
        params.pool0 = wombatPool;
        params.amount0Total = busd.balanceOf(address(this));
        params.totalAmountLpTokens = 0;
        params.reserve0 = pool.balances(0) * valBusd.getAssetPrice() / valBusdDm;
        params.reserve1 = pool.balances(1) * valUsdc.getAssetPrice() / valUsdcDm;
        params.reserve2 = pool.balances(2) * valUsdt.getAssetPrice() / valUsdtDm;
        params.denominator0 = busdDm;
        params.denominator1 = usdcDm;
        params.denominator2 = usdtDm;
        params.precision = 1;
        (uint256 amountUsdcToSwap, uint256 amountUsdtToSwap) = WombatLibrary.getAmountToSwap(params);

        // swap
        _swapFromBusd(amountUsdcToSwap, amountUsdtToSwap);

        // calculate min amount to mint
        uint256[3] memory amounts;
        amounts[0] = busd.balanceOf(address(this));
        amounts[1] = usdc.balanceOf(address(this));
        amounts[2] = usdt.balanceOf(address(this));
        // sub 4 bp to calculate min amount
        uint256 minToMint = OvnMath.subBasisPoints(pool.calc_token_amount(amounts, true), 4);

        // add liquidity
        console.log("busdBalance before: %s", busd.balanceOf(address(this)));
        console.log("usdcBalance before: %s", usdc.balanceOf(address(this)));
        console.log("usdtBalance before: %s", usdt.balanceOf(address(this)));
        busd.approve(address(pool), amounts[0]);
        usdc.approve(address(pool), amounts[1]);
        usdt.approve(address(pool), amounts[2]);
        pool.add_liquidity(amounts, minToMint);
        console.log("busdBalance after: %s", busd.balanceOf(address(this)));
        console.log("usdcBalance after: %s", usdc.balanceOf(address(this)));
        console.log("usdtBalance after: %s", usdt.balanceOf(address(this)));
        console.log("val3EPSBalance before: %s", val3EPS.balanceOf(address(this)));

        // stake
        uint256 val3EPSBalance = val3EPS.balanceOf(address(this));
        val3EPS.approve(address(lpDepositor), val3EPSBalance);
        lpDepositor.deposit(address(this), address(val3EPS), val3EPSBalance);
        console.log("val3EPSBalance after: %s", val3EPS.balanceOf(address(this)));
        console.log("sexVal3EPSBalance after: %s", sexVal3EPS.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busd), "Some token not compatible");
        console.log("_unstake");

        // calculate amount to unstake
        uint256 totalAmountLpTokens = val3EPS.totalSupply();
        uint256 reserve0 = pool.balances(0) * valBusd.getAssetPrice() / valBusdDm;
        uint256 reserve1 = pool.balances(1) * valUsdc.getAssetPrice() / valUsdcDm;
        uint256 reserve2 = pool.balances(2) * valUsdt.getAssetPrice() / valUsdtDm;

        WombatLibrary.CalculateParams memory params;
        params.wombatRouter = wombatRouter;
        params.token0 = address(busd);
        params.token1 = address(usdc);
        params.token2 = address(usdt);
        params.pool0 = wombatPool;
        params.amount0Total = OvnMath.addBasisPoints(_amount, 4) + 10;
        params.totalAmountLpTokens = totalAmountLpTokens;
        params.reserve0 = reserve0;
        params.reserve1 = reserve1;
        params.reserve2 = reserve2;
        params.denominator0 = busdDm;
        params.denominator1 = usdcDm;
        params.denominator2 = usdtDm;
        params.precision = 1;
        uint256 val3EPSAmount = WombatLibrary.getAmountLpTokens(params);
        uint256 val3EPSBalance = lpDepositor.userBalances(address(this), address(val3EPS));
        if (val3EPSAmount > val3EPSBalance) {
            val3EPSAmount = val3EPSBalance;
        }
        console.log("val3EPSAmount: %s", val3EPSAmount);
        console.log("sexVal3EPSBalance before: %s", sexVal3EPS.balanceOf(address(this)));
        console.log("val3EPSBalance before: %s", val3EPS.balanceOf(address(this)));

        // unstake
        lpDepositor.withdraw(address(this), address(val3EPS), val3EPSAmount);
        console.log("val3EPSBalance after: %s", val3EPS.balanceOf(address(this)));
        console.log("sexVal3EPSBalance after: %s", sexVal3EPS.balanceOf(address(this)));
        console.log("busdBalance before: %s", busd.balanceOf(address(this)));

        // remove liquidity
        uint256[3] memory minAmounts;
        minAmounts[0] = OvnMath.subBasisPoints(reserve0 * val3EPSAmount / totalAmountLpTokens, 1);
        minAmounts[1] = OvnMath.subBasisPoints(reserve1 * val3EPSAmount / totalAmountLpTokens, 1);
        minAmounts[2] = OvnMath.subBasisPoints(reserve2 * val3EPSAmount / totalAmountLpTokens, 1);

        val3EPSBalance = val3EPS.balanceOf(address(this));
        val3EPS.approve(address(pool), val3EPSBalance);
        pool.remove_liquidity(val3EPSBalance, minAmounts);
        console.log("val3EPSBalance after: %s", val3EPS.balanceOf(address(this)));
        console.log("busdBalance after: %s", busd.balanceOf(address(this)));

        // swap
        _swapToBusd(usdc.balanceOf(address(this)), usdt.balanceOf(address(this)));

        return busd.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busd), "Some token not compatible");
        console.log("_unstakeFull");

        // calculate amount to unstake
        uint256 val3EPSBalance = lpDepositor.userBalances(address(this), address(val3EPS));

        console.log("val3EPSBalance: %s", val3EPSBalance);
        console.log("sexVal3EPSBalance before: %s", sexVal3EPS.balanceOf(address(this)));
        console.log("val3EPSBalance before: %s", val3EPS.balanceOf(address(this)));
        // unstake
        lpDepositor.withdraw(address(this), address(val3EPS), val3EPSBalance);
        console.log("val3EPSBalance after: %s", val3EPS.balanceOf(address(this)));
        console.log("sexVal3EPSBalance after: %s", sexVal3EPS.balanceOf(address(this)));
        console.log("busdBalance before: %s", busd.balanceOf(address(this)));

        // remove liquidity
        uint256 totalAmountLpTokens = val3EPS.totalSupply();
        uint256 reserve0 = pool.balances(0) * valBusd.getAssetPrice() / valBusdDm;
        uint256 reserve1 = pool.balances(1) * valUsdc.getAssetPrice() / valUsdcDm;
        uint256 reserve2 = pool.balances(2) * valUsdt.getAssetPrice() / valUsdtDm;

        uint256[3] memory minAmounts;
        minAmounts[0] = OvnMath.subBasisPoints(reserve0 * val3EPSBalance / totalAmountLpTokens, 1);
        minAmounts[1] = OvnMath.subBasisPoints(reserve1 * val3EPSBalance / totalAmountLpTokens, 1);
        minAmounts[2] = OvnMath.subBasisPoints(reserve2 * val3EPSBalance / totalAmountLpTokens, 1);

        val3EPSBalance = val3EPS.balanceOf(address(this));
        val3EPS.approve(address(pool), val3EPSBalance);
        pool.remove_liquidity(val3EPSBalance, minAmounts);
        console.log("val3EPSBalance after: %s", val3EPS.balanceOf(address(this)));
        console.log("busdBalance after: %s", busd.balanceOf(address(this)));

        // swap
        _swapToBusd(usdc.balanceOf(address(this)), usdt.balanceOf(address(this)));

        return busd.balanceOf(address(this));
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {
        uint256 busdBalance = busd.balanceOf(address(this));

        uint256 val3EPSBalance = lpDepositor.userBalances(address(this), address(val3EPS));
        if (val3EPSBalance > 0) {
            if (nav) {
                uint256 totalSupply = val3EPS.totalSupply();
                for (uint256 i = 0; i < 3; i++) {
                    uint256 coinBalance = val3EPSBalance * pool.balances(i) / totalSupply;
                    if (address(busd) == pool.coins(i)) {
                        busdBalance += coinBalance * valBusd.getAssetPrice() / valBusdDm;
                    } else if (address(usdc) == pool.coins(i)) {
                        busdBalance += ChainlinkLibrary.convertTokenToToken(coinBalance * valUsdc.getAssetPrice() / valUsdcDm, usdcDm, busdDm, oracleUsdc, oracleBusd);
                    } else if (address(usdt) == pool.coins(i)) {
                        busdBalance += ChainlinkLibrary.convertTokenToToken(coinBalance * valUsdt.getAssetPrice() / valUsdtDm, usdtDm, busdDm, oracleUsdt, oracleBusd);
                    }
                }
            } else {
                //TODO переделать под выход в пропорции
                busdBalance += pool.calc_withdraw_one_coin(val3EPSBalance, 0);
            }
        }

        return busdBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        console.log("_claimRewards");

        // claim rewards
        uint256 val3EPSBalance = lpDepositor.userBalances(address(this), address(val3EPS));
        console.log("val3EPSBalance: %s", val3EPSBalance);
        if (val3EPSBalance > 0) {
            address[] memory tokens = new address[](1);
            tokens[0] = address(val3EPS);
            lpDepositor.claim(address(this), tokens, 0);
            lpDepositor.claimExtraRewards(address(this), address(val3EPS));
        }

        // sell rewards
        uint256 totalBusd;

        uint256 dddBalance = ddd.balanceOf(address(this));
        console.log("dddBalance: %s", dddBalance);
        if (dddBalance > 0) {
            uint256 dddBusdOutMin = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(ddd),
                address(wBnb),
                address(busd),
                dddBalance
            );
            console.log("dddBusdOutMin: %s", dddBusdOutMin);
            if (dddBusdOutMin > 0) {
                uint256 dddBusd = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(ddd),
                    address(wBnb),
                    address(busd),
                    dddBalance,
                    dddBusdOutMin * 99 / 100,
                    address(this)
                );
                console.log("dddBusd: %s", dddBusd);
                totalBusd += dddBusd;
            }
        }

        uint256 epxBalance = epx.balanceOf(address(this));
        console.log("epxBalance: %s", epxBalance);
        if (epxBalance > 0) {
            uint256 epxBusdOutMin = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(epx),
                address(wBnb),
                address(busd),
                epxBalance
            );
            console.log("epxBusdOutMin: %s", epxBusdOutMin);
            if (epxBusdOutMin > 0) {
                uint256 epxBusd = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(epx),
                    address(wBnb),
                    address(busd),
                    epxBalance,
                    epxBusdOutMin * 99 / 100,
                    address(this)
                );
                console.log("epxBusd: %s", epxBusd);
                totalBusd += epxBusd;
            }
        }

        uint256 valasBalance = valas.balanceOf(address(this));
        console.log("valasBalance: %s", valasBalance);
        if (valasBalance > 0) {
            uint256 valasBusdOutMin = PancakeSwapLibrary.getAmountsOut(
                pancakeRouter,
                address(valas),
                address(wBnb),
                address(busd),
                valasBalance
            );
            console.log("valasBusdOutMin: %s", valasBusdOutMin);
            if (valasBusdOutMin > 0) {
                uint256 valasBusd = PancakeSwapLibrary.swapExactTokensForTokens(
                    pancakeRouter,
                    address(valas),
                    address(wBnb),
                    address(busd),
                    valasBalance,
                    valasBusdOutMin * 99 / 100,
                    address(this)
                );
                console.log("valasBusd: %s", valasBusd);
                totalBusd += valasBusd;
            }
        }
        console.log("totalBusd: %s", totalBusd);

        if (totalBusd > 0) {
            busd.transfer(_to, totalBusd);
        }

        return totalBusd;
    }

    function _swapFromBusd(uint256 amountUsdcToSwap, uint256 amountUsdtToSwap) internal {

        // swap busd to usdc
        uint256 usdcBalanceOracle = ChainlinkLibrary.convertTokenToToken(
            amountUsdcToSwap,
            busdDm,
            usdcDm,
            oracleBusd,
            oracleUsdc
        );
        WombatLibrary.swapExactTokensForTokens(
            wombatRouter,
            address(busd),
            address(usdc),
            address(wombatPool),
            amountUsdcToSwap,
            OvnMath.subBasisPoints(usdcBalanceOracle, swapSlippageBP),
            address(this)
        );

        // swap busd to usdt
        uint256 usdtBalanceOracle = ChainlinkLibrary.convertTokenToToken(
            amountUsdtToSwap,
            busdDm,
            usdtDm,
            oracleBusd,
            oracleUsdt
        );
        WombatLibrary.swapExactTokensForTokens(
            wombatRouter,
            address(busd),
            address(usdt),
            address(wombatPool),
            amountUsdtToSwap,
            OvnMath.subBasisPoints(usdtBalanceOracle, swapSlippageBP),
            address(this)
        );
    }

    function _swapToBusd(uint256 amountUsdcToSwap, uint256 amountUsdtToSwap) internal {

        // swap usdc to busd
        uint256 usdcBalanceOracle = ChainlinkLibrary.convertTokenToToken(
            amountUsdcToSwap,
            usdcDm,
            busdDm,
            oracleUsdc,
            oracleBusd
        );
        WombatLibrary.swapExactTokensForTokens(
            wombatRouter,
            address(usdc),
            address(busd),
            address(wombatPool),
            amountUsdcToSwap,
            OvnMath.subBasisPoints(usdcBalanceOracle, swapSlippageBP),
            address(this)
        );

        // swap usdt to busd
        uint256 usdtBalanceOracle = ChainlinkLibrary.convertTokenToToken(
            amountUsdtToSwap,
            usdtDm,
            busdDm,
            oracleUsdt,
            oracleBusd
        );
        WombatLibrary.swapExactTokensForTokens(
            wombatRouter,
            address(usdt),
            address(busd),
            address(wombatPool),
            amountUsdtToSwap,
            OvnMath.subBasisPoints(usdtBalanceOracle, swapSlippageBP),
            address(this)
        );
    }
}
