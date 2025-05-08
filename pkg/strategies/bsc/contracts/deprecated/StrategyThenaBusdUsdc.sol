// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Thena.sol";
import "@overnight-contracts/connectors/contracts/stuff/Wombat.sol";

import "hardhat/console.sol";

contract StrategyThenaBusdUsdc is Strategy {

    // --- structs

    struct StrategyParams {
        address busd;
        address usdc;
        address the;
        address pair;
        address router;
        address gauge;
        address wombatPool;
        address wombatRouter;
        address oracleBusd;
        address oracleUsdc;
    }

    // --- params

    IERC20 public busd;
    IERC20 public usdc;
    IERC20 public the;

    IPair public pair;
    IRouter public router;
    IGaugeV2 public gauge;
    IWombatPool public wombatPool;

    IWombatRouter public wombatRouter;

    IPriceFeed public oracleBusd;
    IPriceFeed public oracleUsdc;

    uint256 public busdDm;
    uint256 public usdcDm;

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
        the = IERC20(params.the);

        pair = IPair(params.pair);
        router = IRouter(params.router);
        gauge = IGaugeV2(params.gauge);
        wombatPool = IWombatPool(params.wombatPool);

        wombatRouter = IWombatRouter(params.wombatRouter);

        oracleBusd = IPriceFeed(params.oracleBusd);
        oracleUsdc = IPriceFeed(params.oracleUsdc);

        busdDm = 10 ** IERC20Metadata(params.busd).decimals();
        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        require(_asset == address(busd), "Some token not compatible");

        // calculate amount to swap
        (uint256 reserveUsdc, uint256 reserveBusd,) = pair.getReserves();
        uint256 busdBalance = busd.balanceOf(address(this));
        uint256 amountBusdToSwap = WombatLibrary.getAmountToSwap(
            wombatRouter,
            address(busd),
            address(usdc),
            address(wombatPool),
            busdBalance,
            reserveBusd,
            reserveUsdc,
            busdDm,
            usdcDm
        );

        // swap busd to usdc
        uint256 usdcBalanceOracle = ChainlinkLibrary.convertTokenToToken(
            amountBusdToSwap,
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
            amountBusdToSwap,
            OvnMath.subBasisPoints(usdcBalanceOracle, swapSlippageBP),
            address(this)
        );

        // add liquidity
        uint256 usdcBalance = usdc.balanceOf(address(this));
        busdBalance = busd.balanceOf(address(this));
        usdc.approve(address(router), usdcBalance);
        busd.approve(address(router), busdBalance);
        router.addLiquidity(
            address(usdc),
            address(busd),
            pair.isStable(),
            usdcBalance,
            busdBalance,
            OvnMath.subBasisPoints(usdcBalance, swapSlippageBP),
            OvnMath.subBasisPoints(busdBalance, swapSlippageBP),
            address(this),
            block.timestamp
        );

        // deposit to gauge
        uint256 lpBalance = pair.balanceOf(address(this));
        pair.approve(address(gauge), lpBalance);
        gauge.deposit(lpBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busd), "Some token not compatible");

        // get amount LP tokens to unstake
        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveUsdc, uint256 reserveBusd,) = pair.getReserves();
        uint256 lpTokensToWithdraw = WombatLibrary.getAmountLpTokens(
            wombatRouter,
            address(busd),
            address(usdc),
            address(wombatPool),
            // add 1e13 to _amount for smooth withdraw
            _amount + 1e13,
            totalLpBalance,
            reserveBusd,
            reserveUsdc,
            busdDm,
            usdcDm
        );
        uint256 lpBalance = gauge.balanceOf(address(this));
        if (lpTokensToWithdraw > lpBalance) {
            lpTokensToWithdraw = lpBalance;
        }

        // withdraw from gauge
        gauge.withdraw(lpTokensToWithdraw);

        // remove liquidity
        (uint256 usdcLpBalance, uint256 busdLpBalance) = router.quoteRemoveLiquidity(
            address(usdc),
            address(busd),
            pair.isStable(),
            lpTokensToWithdraw
        );
        pair.approve(address(router), lpTokensToWithdraw);
        router.removeLiquidity(
            address(usdc),
            address(busd),
            pair.isStable(),
            lpTokensToWithdraw,
            OvnMath.subBasisPoints(usdcLpBalance, swapSlippageBP),
            OvnMath.subBasisPoints(busdLpBalance, swapSlippageBP),
            address(this),
            block.timestamp
        );

        // swap usdc to busd
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 busdBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdc),
            address(busd),
            address(wombatPool),
            usdcBalance
        );
        if (busdBalanceOut > 0) {
            uint256 busdBalanceOracle = ChainlinkLibrary.convertTokenToToken(
                usdcBalance,
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
                usdcBalance,
                OvnMath.subBasisPoints(busdBalanceOracle, swapSlippageBP),
                address(this)
            );
        }

        return busd.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        require(_asset == address(busd), "Some token not compatible");

        uint256 lpBalance = gauge.balanceOf(address(this));

        // withdraw from gauge
        gauge.withdraw(lpBalance);

        // remove liquidity
        (uint256 usdcLpBalance, uint256 busdLpBalance) = router.quoteRemoveLiquidity(
            address(usdc),
            address(busd),
            pair.isStable(),
            lpBalance
        );
        pair.approve(address(router), lpBalance);
        router.removeLiquidity(
            address(usdc),
            address(busd),
            pair.isStable(),
            lpBalance,
            OvnMath.subBasisPoints(usdcLpBalance, swapSlippageBP),
            OvnMath.subBasisPoints(busdLpBalance, swapSlippageBP),
            address(this),
            block.timestamp
        );

        // swap usdc to busd
        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 busdBalanceOut = WombatLibrary.getAmountOut(
            wombatRouter,
            address(usdc),
            address(busd),
            address(wombatPool),
            usdcBalance
        );
        if (busdBalanceOut > 0) {
            uint256 busdBalanceOracle = ChainlinkLibrary.convertTokenToToken(
                usdcBalance,
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
                usdcBalance,
                OvnMath.subBasisPoints(busdBalanceOracle, swapSlippageBP),
                address(this)
            );
        }

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
        uint256 usdcBalance = usdc.balanceOf(address(this));

        uint256 lpBalance = gauge.balanceOf(address(this));
        if (lpBalance > 0) {
            (uint256 usdcLpBalance, uint256 busdLpBalance) = router.quoteRemoveLiquidity(
                address(usdc),
                address(busd),
                pair.isStable(),
                lpBalance
            );
            usdcBalance += usdcLpBalance;
            busdBalance += busdLpBalance;
        }

        if (usdcBalance > 0) {
            if (nav) {
                busdBalance += ChainlinkLibrary.convertTokenToToken(
                    usdcBalance,
                    usdcDm,
                    busdDm,
                    oracleUsdc,
                    oracleBusd
                );
            } else {
                busdBalance += WombatLibrary.getAmountOut(
                    wombatRouter,
                    address(usdc),
                    address(busd),
                    address(wombatPool),
                    usdcBalance
                );
            }
        }

        return busdBalance;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // claim rewards
        uint256 lpBalance = gauge.balanceOf(address(this));
        if (lpBalance > 0) {
            gauge.getReward();
        }

        // sell rewards
        uint256 totalBusd;

        uint256 theBalance = the.balanceOf(address(this));
        if (theBalance > 0) {
            uint256 theAmountOut = ThenaLibrary.getAmountOut(
                router,
                address(the),
                address(busd),
                false,
                theBalance
            );
            if (theAmountOut > 0) {
                totalBusd += ThenaLibrary.swap(
                    router,
                    address(the),
                    address(busd),
                    false,
                    theBalance,
                    OvnMath.subBasisPoints(theAmountOut, 10),
                    address(this)
                );
            }
        }

        if (totalBusd > 0) {
            busd.transfer(_to, totalBusd);
        }

        return totalBusd;
    }

}
