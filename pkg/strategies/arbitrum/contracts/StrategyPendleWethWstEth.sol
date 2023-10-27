// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "@overnight-contracts/connectors/contracts/stuff/Magpie.sol";
import "hardhat/console.sol";

contract StrategyPendleWethWstEth is Strategy {

    // --- structs

    struct StrategyParams {
        address weth;
        address wstEth;
        address pt;
        address yt;
        address sy;
        address lp;
        address pendleRouter;
        address ptOracle;
        address pendleStaking;
        address depositHelperMgp;
        address masterMgp;
        address uniswapV3Router;
        address pnp;
        address pendle;
        address oracleWstEthEth;
        uint256 thresholdBalancePercent;
    }

    // --- params

    IERC20 public weth;
    IERC20 public wstEth;
    IERC20 public pt;
    IERC20 public yt;

    IPendleStargateLPSY public sy;
    IPendleMarket public lp;
    IPendleRouter public pendleRouter;
    IPendlePtOracle public ptOracle;

    address public pendleStaking;
    PendleMarketDepositHelper public depositHelperMgp;
    MasterMagpie public masterMgp;

    ISwapRouter public uniswapV3Router;

    IPriceFeed public oracleWstEthEth;

    IERC20 public pnp;
    IERC20 public pendle;

    uint256 public thresholdBalancePercent;

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
        weth = IERC20(params.weth);
        wstEth = IERC20(params.wstEth);
        pt = IERC20(params.pt);
        yt = IERC20(params.yt);

        sy = IPendleStargateLPSY(params.sy);
        lp = IPendleMarket(params.lp);
        pendleRouter = IPendleRouter(params.pendleRouter);
        ptOracle = IPendlePtOracle(params.ptOracle);

        pendleStaking = params.pendleStaking;
        depositHelperMgp = PendleMarketDepositHelper(params.depositHelperMgp);
        masterMgp = MasterMagpie(params.masterMgp);

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);

        oracleWstEthEth = IPriceFeed(params.oracleWstEthEth);

        pnp = IERC20(params.pnp);
        pendle = IERC20(params.pendle);

        thresholdBalancePercent = params.thresholdBalancePercent;

        uint256 MAX_UINT_VALUE = type(uint256).max;
        wstEth.approve(address(sy), MAX_UINT_VALUE);
        wstEth.approve(address(pendleRouter), MAX_UINT_VALUE);
        sy.approve(address(pendleRouter), MAX_UINT_VALUE);
        pt.approve(address(pendleRouter), MAX_UINT_VALUE);
        yt.approve(address(pendleRouter), MAX_UINT_VALUE);
        lp.approve(address(pendleRouter), MAX_UINT_VALUE);
        lp.approve(pendleStaking, MAX_UINT_VALUE);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // 1. Swap weth to wstEth
        uint256 wethBalance = weth.balanceOf(address(this));
        console.log("wethBalance: %s", wethBalance);
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(weth),
            address(wstEth),
            100, // fee 0.01%
            address(this),
            wethBalance,
            OvnMath.subBasisPoints(_oracleWethToWstEth(wethBalance), swapSlippageBP)
        );

        // 2. Calculate wstEth we should swap to SY
        uint256 wstEthAmount = wstEth.balanceOf(address(this));
        console.log("wstEthAmount: %s", wstEthAmount);
        uint256 syAmount = sy.balanceOf(address(this));
        console.log("syAmount: %s", syAmount);
        MarketStorage memory marketStorage = lp._storage();
        uint256 syReserves = uint256(uint128(marketStorage.totalSy));
        console.log("syReserves: %s", syReserves);
        uint256 ptReserves = _oracleWethToWstEth(_ptInWeth(uint256(uint128(marketStorage.totalPt))));
        console.log("ptReserves: %s", ptReserves);
        uint256 ptRate = ptOracle.getPtToAssetRate(address(lp), 50);
        uint256 amountWstEthToSy = wstEthAmount * syReserves * ptRate / (syReserves * ptRate + ptReserves * 1e18);
        console.log("amountWstEthToSy: %s", amountWstEthToSy);

        // 3. Deposit wstEth to SY
        console.log("wstEth.balanceOf(address(this))): %s", wstEth.balanceOf(address(this)));
        sy.deposit(address(this), address(wstEth), amountWstEthToSy, 0);
        console.log("sy.balanceOf(address(this))): %s", sy.balanceOf(address(this)));

        // 4. Mint from wstEth to PT+YT
        console.log("wstEth.balanceOf(address(this))): %s", wstEth.balanceOf(address(this)));
        SwapData memory swapData;
        TokenInput memory input = TokenInput(address(wstEth), wstEth.balanceOf(address(this)), address(wstEth), address(0), address(0), swapData);
        pendleRouter.mintPyFromToken(address(this), address(yt), 0, input);
        console.log("wstEth.balanceOf(address(this))) after: %s", wstEth.balanceOf(address(this)));
        console.log("pt.balanceOf(address(this))): %s", pt.balanceOf(address(this)));
        console.log("yt.balanceOf(address(this))): %s", yt.balanceOf(address(this)));

        // 5. Add Liquidity in PT+SY
        pendleRouter.addLiquidityDualSyAndPt(address(this), address(lp), sy.balanceOf(address(this)), pt.balanceOf(address(this)), 0);

        console.log("sy.balanceOf(address(this)) after: %s", sy.balanceOf(address(this)));
        console.log("pt.balanceOf(address(this)) after: %s", pt.balanceOf(address(this)));
        console.log("yt.balanceOf(address(this)) after: %s", yt.balanceOf(address(this)));
        console.log("lp.balanceOf(address(this)) after: %s", lp.balanceOf(address(this)));
        // 6. Stake lp to Magpie
        depositHelperMgp.depositMarket(address(lp), lp.balanceOf(address(this)));
        console.log("lp.balanceOf(address(this)) after: %s", lp.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // 1. Calculate lp we should remove from main pool
        uint256 lpAmount = _calcLpByAmount(OvnMath.addBasisPoints(_amount, stakeSlippageBP));

        // 2. Unstake exact Lp
        _unstakeExactLp(lpAmount, false);

        return weth.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // 1. Unstake all Lp
        _unstakeExactLp(depositHelperMgp.balance(address(lp), address(this)), true);

        return weth.balanceOf(address(this));
    }

    function _calcLpByAmount(uint256 amount) internal returns(uint256 lpAmount) {

        console.log("amount: %s", amount);
        MarketStorage memory marketStorage = lp._storage();
        uint256 syReserves = _oracleWstEthToWeth(uint256(uint128(marketStorage.totalSy)));
        uint256 ptReserves = _ptInWeth(uint256(uint128(marketStorage.totalPt)));
        console.log("syReserves: %s", syReserves);
        console.log("ptReserves: %s", ptReserves);

        uint256 totalLpBalance = lp.totalSupply();
        console.log("totalLpBalance: %s", totalLpBalance);

        uint256 lpAmount1 = amount * totalLpBalance / (syReserves + ptReserves);
        console.log("lpAmount1: %s", lpAmount1);
        uint256 ytBalance = _ytInWeth(yt.balanceOf(address(this)));
        console.log("ytBalance: %s", ytBalance);
        if (amount > ytBalance) {
            uint256 lpAmount2 = (amount - ytBalance) * totalLpBalance / syReserves;
            console.log("lpAmount2: %s", lpAmount2);
            lpAmount = lpAmount1 > lpAmount2 ? lpAmount1 : lpAmount2;
        } else {
            lpAmount = lpAmount1;
        }
        console.log("lpAmount: %s", lpAmount);
    }

    function _unstakeExactLp(uint256 lpAmount, bool clearDiff) internal {

        console.log("wstEthBalance before all: %s", wstEth.balanceOf(address(this)));
        // 1. Unstake lp from Magpie
        depositHelperMgp.withdrawMarket(address(lp), lpAmount);

        console.log("wstEthBalance before 0: %s", wstEth.balanceOf(address(this)));
        console.log("lp.balanceOf(address(this)): %s", lp.balanceOf(address(this)));
        // 2. Remove liquidity from main pool
        pendleRouter.removeLiquidityDualSyAndPt(address(this), address(lp), lpAmount, 0, 0);

        console.log("wstEthBalance before 1: %s", wstEth.balanceOf(address(this)));
        // 3. Redeem from (pt+yt) to wstEth
        uint256 ptBalance = _ptInWeth(pt.balanceOf(address(this)));
        uint256 ytBalance = _ytInWeth(yt.balanceOf(address(this)));
        console.log("ptBalance: %s", ptBalance);
        console.log("ytBalance: %s", ytBalance);
        uint256 minAmount = _oracleWethToWstEth((ptBalance < ytBalance) ? ptBalance : ytBalance);
        console.log("minAmount: %s", minAmount);
        if (minAmount > 0) {
            SwapData memory swapData;
            TokenOutput memory output = TokenOutput(address(wstEth), 0, address(wstEth), address(0), address(0), swapData);
            pendleRouter.redeemPyToToken(address(this), address(yt), minAmount, output);
        }
        console.log("ptBalance after: %s", pt.balanceOf(address(this)));
        console.log("ytBalance after: %s", yt.balanceOf(address(this)));

        console.log("wstEthBalance before 2: %s", wstEth.balanceOf(address(this)));
        // 4. Clear diff
        if (clearDiff) {
            _movePtToSy(pt.balanceOf(address(this)));
            _moveYtToSy(yt.balanceOf(address(this)));
        }

        console.log("wstEthBalance before 3: %s", wstEth.balanceOf(address(this)));
        // 5. Redeem from SY to wstEth
        console.log("sy balance: %s", sy.balanceOf(address(this)));
        sy.redeem(address(this), sy.balanceOf(address(this)), address(wstEth), 0, false);
        console.log("sy balance after: %s", sy.balanceOf(address(this)));

        // 6. Swap wstEth to weth
        uint256 wstEthBalance = wstEth.balanceOf(address(this));
        console.log("wstEthBalance: %s", wstEthBalance);
        console.log("weth: %s", weth.balanceOf(address(this)));
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(wstEth),
            address(weth),
            100, // fee 0.01%
            address(this),
            wstEthBalance,
            OvnMath.subBasisPoints(_oracleWstEthToWeth(wstEthBalance), swapSlippageBP)
        );
        console.log("wstEthBalance after: %s", wstEth.balanceOf(address(this)));
        console.log("weth after: %s", weth.balanceOf(address(this)));
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // 1. Harvest rewards
        depositHelperMgp.harvest(address(lp), 0);

        // 2. Claim rewards
        _claimSpecPnp();

        // 3. Check and make pt and yt amounts equal
        _equPtYt();

        // 4. Sell rewards
        uint256 totalWeth;

        uint256 pnpBalance = pnp.balanceOf(address(this));
        if (pnpBalance > 0) {
            totalWeth += UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(pnp),
                address(weth),
                10000, // fee 1%
                address(this),
                pnpBalance,
                0
            );
        }

        uint256 pendleBalance = pendle.balanceOf(address(this));
        if (pendleBalance > 0) {
            totalWeth += UniswapV3Library.singleSwap(
                uniswapV3Router,
                address(pendle),
                address(weth),
                3000, // fee 0.3%
                address(this),
                pendleBalance,
                0
            );
        }

        // 5. Transfer rewards
        if (totalWeth > 0) {
            weth.transfer(_to, totalWeth);
        }

        return totalWeth;
    }

    function _claimSpecPnp() internal {

        address[] memory stakingRewards = new address[](1);
        stakingRewards[0] = address(lp);

        address[] memory tokens = new address[](2);
        tokens[0] = address(pnp);
        tokens[1] = address(pendle);

        address[][] memory rewardTokens = new address [][](1);
        rewardTokens[0] = tokens;

        masterMgp.multiclaimSpecPNP(stakingRewards, rewardTokens, true);
    }

    function _equPtYt() internal {

        uint256 nav = _totalValue(true);
        
        (,uint256 ptAmount) = _getAmountsByLp();
        ptAmount += pt.balanceOf(address(this));
        uint256 ytAmount = yt.balanceOf(address(this));
        uint256 ptInWeth = _ptInWeth(ptAmount);
        uint256 ytInWeth = _ytInWeth(ytAmount);

        if (ptInWeth > ytInWeth) {
            uint256 delta = ptInWeth - ytInWeth;
            if (delta > nav * thresholdBalancePercent / 100) {
                _movePtToSy(_wethInPt(delta));
            }
        } else {
            uint256 delta = ytInWeth - ptInWeth;
            if (delta > nav * thresholdBalancePercent / 100) {
                _moveYtToSy(_wethInYt(delta));
            }
        }
    }

    function _getAmountsByLp() internal view returns (uint256 syAmount, uint256 ptAmount) {

        MarketStorage memory marketStorage = lp._storage();
        uint256 syReserves = uint256(uint128(marketStorage.totalSy));
        uint256 ptReserves = uint256(uint128(marketStorage.totalPt));

        uint256 lpTokenBalance = depositHelperMgp.balance(address(lp), address(this));
        lpTokenBalance += lp.balanceOf(address(this));
        console.log("lpTokenBalance: %s", lpTokenBalance);

        uint256 totalLpBalance = lp.totalSupply();
        syAmount = syReserves * lpTokenBalance / totalLpBalance;
        ptAmount = ptReserves * lpTokenBalance / totalLpBalance;
    }
    
    function _ptInWeth(uint256 amount) internal view returns (uint256) {
        uint256 ptRate = ptOracle.getPtToAssetRate(address(lp), 50);
        return ptRate * amount / 1e18;
    }

    function _ytInWeth(uint256 amount) internal view returns (uint256) {
        uint256 ptRate = ptOracle.getPtToAssetRate(address(lp), 50);
        return (1e18 - ptRate) * amount / 1e18;
    }

    function _wethInPt(uint256 amount) internal view returns (uint256) {
        uint256 ptRate = ptOracle.getPtToAssetRate(address(lp), 50);
        return amount * 1e18 / ptRate;
    }

    function _wethInYt(uint256 amount) internal view returns (uint256) {
        uint256 ptRate = ptOracle.getPtToAssetRate(address(lp), 50);
        return amount * 1e18 / (1e18 - ptRate);
    }

    function _movePtToSy(uint256 ptBalance) internal {
        if (ptBalance > 0 && ptBalance <= pt.balanceOf(address(this))) {
            pendleRouter.swapExactPtForSy(address(this), address(lp), ptBalance, 0);
        }
    }

    function _moveYtToSy(uint256 ytBalance) internal {
        if (ytBalance > 0 && ytBalance <= yt.balanceOf(address(this))) {
            pendleRouter.swapExactYtForSy(address(this), address(lp), ytBalance, 0);
        }
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {

        uint256 wethAmount = weth.balanceOf(address(this));
        console.log("wethAmount: %s", wethAmount);
        uint256 wstEthAmount = wstEth.balanceOf(address(this));
        console.log("wstEthAmount: %s", wstEthAmount);

        (uint256 syAmount, uint256 ptAmount) = _getAmountsByLp();
        console.log("syAmount: %s", syAmount);
        console.log("ptAmount: %s", ptAmount);
        syAmount += sy.balanceOf(address(this));
        ptAmount += pt.balanceOf(address(this));
        console.log("syAmount: %s", syAmount);
        console.log("ptAmount: %s", ptAmount);
        uint256 ytAmount = yt.balanceOf(address(this));
        console.log("ytAmount: %s", ytAmount);

        wstEthAmount += syAmount;
        console.log("wstEthAmount: %s", wstEthAmount);

        uint256 ptInWeth = _ptInWeth(ptAmount);
        uint256 ytInWeth = _ytInWeth(ytAmount);
        console.log("ptInWeth: %s", ptInWeth);
        console.log("ytInWeth: %s", ytInWeth);
        wethAmount += ptInWeth + ytInWeth;
        console.log("wstEthAmount: %s", wstEthAmount);

        if (wstEthAmount > 0) {
            if (nav) {
                wethAmount += _oracleWstEthToWeth(wstEthAmount);
            } else {
                wethAmount += OvnMath.subBasisPoints(_oracleWstEthToWeth(wstEthAmount), swapSlippageBP);
            }
        }
        console.log("wethAmount: %s", wethAmount);

        return wethAmount;
    }

    function _oracleWstEthToWeth(uint256 amount) internal view returns (uint256) {
        return amount * ChainlinkLibrary.getPrice(oracleWstEthEth) / 1e18; // amount * price / wstEth decimals
    }

    function _oracleWethToWstEth(uint256 amount) internal view returns (uint256) {
        uint256 price = ChainlinkLibrary.getPrice(oracleWstEthEth);
        return amount * 1e18 / price; // amount * wstEth decimals / price
    }
}
