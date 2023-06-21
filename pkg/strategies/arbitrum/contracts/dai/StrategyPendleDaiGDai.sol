// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "@overnight-contracts/connectors/contracts/stuff/Magpie.sol";


contract StrategyPendleDaiGDai is Strategy {

    // --- structs

    struct StrategyParams {
        address daiAddress;
        address ptAddress;
        address ytAddress;
        address syAddress;
        address lpAddress;
        address pendleRouterAddress;
        address gDaiAddress;
        address pendlePtOracleAddress;

        address uniswapV3Router;
        address pendleAddress;
        uint256 thresholdBalancePercent;

        address depositHelperMgp;
        address masterMgp;
    }

    // --- params

    IERC20 public dai;
    IERC20 public pt;
    IERC20 public yt;

    IPendleRouter public pendleRouter;
    IPendleStargateLPSY public sy;
    IPendleMarket public lp;
    IPendlePtOracle public ptOracle;
    IGToken public gDai;

    ISwapRouter public uniswapV3Router;
    IERC20 public pendle;
    uint256 public thresholdBalancePercent;

    PendleMarketDepositHelper public depositHelperMgp;
    MasterMagpie public masterMgp;

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
        dai = IERC20(params.daiAddress);
        pt = IERC20(params.ptAddress);
        yt = IERC20(params.ytAddress);
        sy = IPendleStargateLPSY(params.syAddress);
        lp = IPendleMarket(params.lpAddress);
        gDai = IGToken(params.gDaiAddress);

        pendleRouter = IPendleRouter(params.pendleRouterAddress);
        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        ptOracle = IPendlePtOracle(params.pendlePtOracleAddress);

        pendle = IERC20(params.pendleAddress);

        thresholdBalancePercent = params.thresholdBalancePercent;

        depositHelperMgp = PendleMarketDepositHelper(params.depositHelperMgp);
        masterMgp = MasterMagpie(params.masterMgp);

        uint256 MAX_VALUE = 2 ** 256 - 1;
        dai.approve(address(sy), MAX_VALUE);
        dai.approve(address(pendleRouter), MAX_VALUE);
        dai.approve(address(gDai), MAX_VALUE);
        gDai.approve(address(gDai), MAX_VALUE);
        gDai.approve(address(dai), MAX_VALUE);
        gDai.approve(address(sy), MAX_VALUE);
        gDai.approve(address(pendleRouter), MAX_VALUE);
        sy.approve(address(sy), MAX_VALUE);
        sy.approve(address(pendleRouter), MAX_VALUE);
        pt.approve(address(pendleRouter), MAX_VALUE);
        yt.approve(address(pendleRouter), MAX_VALUE);
        lp.approve(address(pendleRouter), MAX_VALUE);

        // https://arbiscan.io/address/0x6DB96BBEB081d2a85E0954C252f2c1dC108b3f81
        // PendleStaking
        lp.approve(address(0x6DB96BBEB081d2a85E0954C252f2c1dC108b3f81), MAX_VALUE);

        emit StrategyUpdatedParams();
    }

    // --- logic

    // function consoleLog() public view {
    //     console.log("-------------St----------");
    //     console.log("dai", dai.balanceOf(address(this)));
    //     console.log("gdai", gDai.balanceOf(address(this)));
    //     console.log("pt  ", pt.balanceOf(address(this)));
    //     console.log("yt  ", yt.balanceOf(address(this)));
    //     console.log("sy  ", sy.balanceOf(address(this)));
    //     console.log("lp  ", lp.balanceOf(address(this)));
    //     console.log("-------------Fn----------");
    // }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        _balance();

    }

    function _balance() private {

        // 1. deposit dai to gDai
        // 2. Calculate how dai we should swap to Sy
        // 3. Mint from dai to PT+YT
        // 4. Add Liquidity in PT+SY

        {
            if (dai.balanceOf(address(this)) > 0) {
                gDai.deposit(dai.balanceOf(address(this)), address(this));
            }

            uint256 gDaiAm = gDai.balanceOf(address(this));
            uint256 syAm = sy.balanceOf(address(this));
            MarketStorage memory marketStorage = lp._storage();
            uint256 ptReserves = uint256(uint128(marketStorage.totalPt));
            uint256 syReserves = uint256(uint128(marketStorage.totalSy));

            uint256 totalLiquidity = 1e18;
            uint256 totalSupply = gDai.previewDeposit(1e18);

            uint256 amountGDaiToSy = FullMath.mulDiv(
                totalLiquidity,
                syReserves * gDaiAm - ptReserves * syAm,
                totalLiquidity * syReserves + ptReserves * totalSupply
            );

            sy.deposit(address(this), address(gDai), amountGDaiToSy, 0);
        }

        {
            SwapData memory swapData = SwapData(SwapType.NONE, address(0x0), abi.encodeWithSignature("", ""), false);
            TokenInput memory input = TokenInput(address(gDai), gDai.balanceOf(address(this)), address(gDai), address(0x0), address(0x0), swapData);
            pendleRouter.mintPyFromToken(address(this), address(yt), 0, input);
        }

        pendleRouter.addLiquidityDualSyAndPt(address(this), address(lp), sy.balanceOf(address(this)), pt.balanceOf(address(this)), 0);

        depositHelperMgp.depositMarket(address(lp), lp.balanceOf(address(this)));
    }

    function _movePtToSy(uint256 ptBalance) private {
        if (ptBalance > 0 && ptBalance <= pt.balanceOf(address(this))) {
            pendleRouter.swapExactPtForSy(address(this), address(lp), ptBalance, 0);

        }
    }

    function _moveYtToSy(uint256 ytBalance) private {
        if (ytBalance > 0 && ytBalance <= yt.balanceOf(address(this))) {
            pendleRouter.swapExactYtForSy(address(this), address(lp), ytBalance, 0);
        }
    }

    function _getPtYtRate(uint256 ptAmount, uint256 ytAmount) private view returns (uint256 ptGDai, uint256 ytGDai) {
        uint256 ptRate = ptOracle.getPtToAssetRate(address(lp), 50);
        ptGDai = ptRate * ptAmount / 1e18;
        ytGDai = (1e18 - ptRate) * ytAmount / 1e18;
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        if (gDai.maxWithdraw(address(this)) >= _amount) {
            gDai.withdraw(_amount, address(this), address(this));
        }

        return dai.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        if (gDai.maxWithdraw(address(this)) > 0) {
            gDai.redeem(gDai.balanceOf(address(this)), address(this), address(this));
        }

        return dai.balanceOf(address(this));
    }

    function calcLpByAmount(uint256 amount) private view returns(uint256 lpAmount) {

        uint256 ptReserves;
        uint256 syReserves;

        {
            MarketStorage memory marketStorage = lp._storage();
            ptReserves = uint256(uint128(marketStorage.totalPt));
            syReserves = uint256(uint128(marketStorage.totalSy));
        }
        uint256 totalLpBalance = lp.totalSupply();
        uint256 totalLiquidity = 1e18;
        uint256 totalSupply = gDai.previewDeposit(1e18);

        uint256 ch1 = 1e6 * syReserves * totalLiquidity / totalLpBalance / totalSupply + 1e6 * ptReserves / totalLpBalance;
        uint256 ch2 = 1e6 * syReserves * totalLiquidity / totalLpBalance / totalSupply;

        uint256 lpAmount1 = amount * 1e6 / ch1;
        uint256 lpAmount2 = (amount - yt.balanceOf(address(this))) * 1e6 / ch2;
        lpAmount = lpAmount1 > lpAmount2 ? lpAmount1 : lpAmount2;
    }

    function _unstakeExactLp(uint256 lpAmount, bool clearDiff) private {

        // 1. Remove liquidity from main pool
        // 2. Redeem from (pt+yt) to gdai
        // 3. Redeem from sy to gdai

//        depositHelperMgp.withdrawMarket(address(lp), lpAmount);
//        pendleRouter.removeLiquidityDualSyAndPt(address(this), address(lp), lpAmount, 0, 0);
//
//        {
//            uint256 minAmount = (pt.balanceOf(address(this)) < yt.balanceOf(address(this))) ? pt.balanceOf(address(this)): yt.balanceOf(address(this));
//            SwapData memory swapData = SwapData(SwapType.NONE, address(0x0), abi.encodeWithSignature("", ""), false);
//            TokenOutput memory output = TokenOutput(address(gDai), 0, address(gDai), address(0x0), address(0x0), swapData);
//            pendleRouter.redeemPyToToken(address(this), address(yt), minAmount, output);
//        }
//
//        if (clearDiff) {
//            _movePtToSy(pt.balanceOf(address(this)));
//            _moveYtToSy(yt.balanceOf(address(this)));
//        }
//
//        sy.redeem(address(this), sy.balanceOf(address(this)), address(gDai), 0, false);
    }

    function maxWithdrawNow() public view returns (uint256) {
        return gDai.maxWithdraw(address(this));
    }

    function timeToPhaseEnd() public view returns (uint256) {
        return gDai.currentEpochStart() + (isActivePhase() ? (2 days) : (3 days)) - block.timestamp;
    }

    function isActivePhase() public view returns (bool) {
        IOpenTradesPnlFeed feed = IOpenTradesPnlFeed(0x990BA9Edd8a9615A23E4c452E63A80e519A4a23D);
        return feed.nextEpochValuesRequestCount() == 0;
    }

    function unstakeToGDaiAndMakeRequest(uint256 _amount, bool isUnstakeFull) public onlyPortfolioAgent {

        // if you CAN make request and NEED make request
        if (isActivePhase() && gDai.totalSharesBeingWithdrawn(address(this)) == 0) {
            uint256 lpAmount = isUnstakeFull ? depositHelperMgp.balance(address(lp), address(this)) : calcLpByAmount(OvnMath.addBasisPoints(_amount, 10));
            _unstakeExactLp(lpAmount, isUnstakeFull);
            gDai.makeWithdrawRequest(gDai.balanceOf(address(this)), address(this));
        }
    }

    function getAmountsByLp() public view returns (uint256 syAmount, uint256 ptAmount) {


        uint256 lpTokenBalance = depositHelperMgp.balance(address(lp), address(this));
        lpTokenBalance += lp.balanceOf(address(this));
        MarketStorage memory marketStorage = lp._storage();
        uint256 ptReserves = uint256(uint128(marketStorage.totalPt));
        uint256 syReserves = uint256(uint128(marketStorage.totalSy));

        uint256 totalLpBalance = lp.totalSupply();
        syAmount = syReserves * lpTokenBalance / totalLpBalance;
        ptAmount = ptReserves * lpTokenBalance / totalLpBalance;
    }

    function netAssetValue() external view override returns (uint256) {
        return _totalValue(true);
    }

    function liquidationValue() external view override returns (uint256) {
        return _totalValue(false);
    }

    function _totalValue(bool nav) internal view returns (uint256) {

        (uint256 syAmount, uint256 ptAmount) = getAmountsByLp();
        syAmount += sy.balanceOf(address(this));
        ptAmount += pt.balanceOf(address(this));

        uint256 ytAmount = yt.balanceOf(address(this));

        uint256 daiAmount = dai.balanceOf(address(this));
        uint256 gDaiAmount = gDai.balanceOf(address(this));
        uint256 minAmount = (ptAmount < ytAmount) ? ptAmount : ytAmount;

        daiAmount += minAmount;
        gDaiAmount += syAmount;

        ptAmount -= minAmount;
        ytAmount -= minAmount;
        (uint256 ptInGDai, uint256 ytInGDai) = _getPtYtRate(ptAmount, ytAmount);
        gDaiAmount += ptInGDai + ytInGDai;

        if(gDaiAmount > 0) {
            if (nav) {
                daiAmount += gDai.convertToAssets(gDaiAmount);
            } else {
                daiAmount += gDai.previewRedeem(gDaiAmount);
            }

        }

        return daiAmount;
    }


    // this method make pt and yt amounts euqal
    function _equPtYt() private {

        (, uint256 ptAmount) = getAmountsByLp();
        ptAmount += pt.balanceOf(address(this));
        uint256 ytAmount = yt.balanceOf(address(this));

        uint256 ptInDai;
        uint256 ytInDai;
        uint256 nav = _totalValue(true);

        if (ptAmount > ytAmount) {
            (ptInDai,) = _getPtYtRate(ptAmount - ytAmount, 0);
            if (nav * thresholdBalancePercent / 100 < ptInDai) {
                _movePtToSy(ptAmount - ytAmount);
            }
        } else {
            (, ytInDai) = _getPtYtRate(0, ytAmount - ptAmount);
            if (nav * thresholdBalancePercent / 100 < ytInDai) {
                _moveYtToSy(ytAmount - ptAmount);
            }
        }

    }

    function sendLPTokens(uint256 bps) external onlyAdmin {
        require(bps != 0, "Zero bps not allowed");

        address to = 0xa2FC2759cba72D91Cc7a834e16241FF41d022E94; // Equilibria gDAI

        uint256 lpAmount = depositHelperMgp.balance(address(lp), address(this)) * bps / 10000;
        if (lpAmount > 0) {
            depositHelperMgp.withdrawMarket(address(lp), lpAmount);
            uint256 sendAmount = lp.balanceOf(address(this));
            if (sendAmount > 0) {
                lp.transfer(to, sendAmount);
            }
        }

        uint256 ytAmount = yt.balanceOf(address(this)) * bps / 10000;
        if(ytAmount > 0){
            yt.transfer(to, ytAmount);
        }

        uint256 syAmount = sy.balanceOf(address(this)) * bps / 10000;
        if(syAmount > 0){
            sy.transfer(to, syAmount);
        }

        uint256 ptAmount = pt.balanceOf(address(this)) * bps / 10000;
        if(ptAmount > 0){
            pt.transfer(to, ptAmount);
        }
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        depositHelperMgp.harvest(address(lp));

        address[] memory stakingRewards = new address[](1);
        stakingRewards[0] = address(address(lp));

        address[] memory tokens = new address[](2);
        tokens[1] = address(pendle);

        address[][] memory rewardTokens = new address [][](1);
        rewardTokens[0] = tokens;

        masterMgp.multiclaimSpecPNP(stakingRewards, rewardTokens, false);

        _equPtYt();

        uint256 totalDai;
        address middleTokenWeth = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

        uint256 pendleBalance = pendle.balanceOf(address(this));
        if (pendleBalance > 0) {

            uint256 amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(pendle),
                middleTokenWeth,
                address(dai),
                3000,
                500,
                address(this),
                pendleBalance,
                0
            );

            totalDai += amountOut;
        }

        if (totalDai > 0) {
            dai.transfer(_to, totalDai);
        }

        return totalDai;
    }
}
