// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Ellipsis.sol";
import "@overnight-contracts/connectors/contracts/stuff/DotDot.sol";
import "@overnight-contracts/connectors/contracts/stuff/PancakeV2.sol";

import "hardhat/console.sol";

contract StrategyEllipsisDotDotBusd is Strategy {

    // --- structs

    struct StrategyParams {
        address busd;
        address usdc;
        address usdt;
        address wBnb;
        address valas;
        address ddd;
        address epx;
        address val3EPS;
        address sexVal3EPS;
        address pool;
        address lpDepositor;
        address pancakeRouter;
        address oracleBusd;
        address oracleUsdc;
        address oracleUsdt;
    }

    // --- params

    IERC20 public busd;
    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public wBnb;
    IERC20 public valas;
    IERC20 public ddd;
    IERC20 public epx;

    IERC20 public val3EPS;
    IERC20 public sexVal3EPS;

    IPool public pool;
    ILpDepositor public lpDepositor;

    IPancakeRouter02 public pancakeRouter;

    IPriceFeed public oracleBusd;
    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    uint256 public busdDm;
    uint256 public usdcDm;
    uint256 public usdtDm;

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
        valas = IERC20(params.valas);
        ddd = IERC20(params.ddd);
        epx = IERC20(params.epx);

        val3EPS = IERC20(params.val3EPS);
        sexVal3EPS = IERC20(params.sexVal3EPS);

        pool = IPool(params.pool);
        lpDepositor = ILpDepositor(params.lpDepositor);

        pancakeRouter = IPancakeRouter02(params.pancakeRouter);

        oracleBusd = IPriceFeed(params.oracleBusd);
        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        busdDm = 10 ** IERC20Metadata(params.busd).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

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
        uint256 busdBalance = busd.balanceOf(address(this));
        uint256[3] memory amounts;
        // sub 4 bp to calculate min amount
        amounts[0] = OvnMath.subBasisPoints(busdBalance, 4);
        amounts[1] = 0;
        amounts[2] = 0;
        uint256 minToMint = pool.calc_token_amount(amounts, true);
        amounts[0] = busdBalance;

        console.log("busdBalance before: %s", busd.balanceOf(address(this)));
        // add liquidity
        busd.approve(address(pool), busdBalance);
        pool.add_liquidity(amounts, minToMint);
        console.log("busdBalance after: %s", busd.balanceOf(address(this)));
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
        uint256[3] memory amounts;
        // add 4 bp to unstake more than requested
        amounts[0] = OvnMath.addBasisPoints(_amount, 4) + 10;
        amounts[1] = 0;
        amounts[2] = 0;
        uint256 val3EPSAmount = pool.calc_token_amount(amounts, false);
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
        val3EPSBalance = val3EPS.balanceOf(address(this));
        val3EPS.approve(address(pool), val3EPSBalance);
        pool.remove_liquidity_one_coin(val3EPSBalance, 0, _amount);
        console.log("val3EPSBalance after: %s", val3EPS.balanceOf(address(this)));
        console.log("busdBalance after: %s", busd.balanceOf(address(this)));

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
        val3EPSBalance = val3EPS.balanceOf(address(this));
        uint256 minAmount = pool.calc_withdraw_one_coin(val3EPSBalance, 0);
        val3EPS.approve(address(pool), val3EPSBalance);
        pool.remove_liquidity_one_coin(val3EPSBalance, 0, minAmount);
        console.log("val3EPSBalance after: %s", val3EPS.balanceOf(address(this)));
        console.log("busdBalance after: %s", busd.balanceOf(address(this)));

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
                        busdBalance += coinBalance;
                    } else if (address(usdc) == pool.coins(i)) {
                        busdBalance += ChainlinkLibrary.convertTokenToToken(coinBalance, usdcDm, busdDm, oracleUsdc, oracleBusd);
                    } else if (address(usdt) == pool.coins(i)) {
                        busdBalance += ChainlinkLibrary.convertTokenToToken(coinBalance, usdtDm, busdDm, oracleUsdt, oracleBusd);
                    }
                }
            } else {
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

}
