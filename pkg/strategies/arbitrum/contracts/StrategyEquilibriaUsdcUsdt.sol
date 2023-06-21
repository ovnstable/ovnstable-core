// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";
import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "@overnight-contracts/connectors/contracts/stuff/Equilibria.sol";

import "./libraries/EquilibriaRewardUsdcUsdtLibrary.sol";

import "hardhat/console.sol";

contract StrategyEquilibriaUsdcUsdt is Strategy {

    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address ptAddress;
        address ytAddress;
        address syAddress;
        address lpAddress;
        address pendleRouterAddress;
        address stargateUsdtAddress;
        address pendlePtOracleAddress;
        address curvePool;

    }

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public pt;
    IERC20 public yt;

    IPendleRouter public pendleRouter;
    IPendleStargateLPSY public sy;
    IPendleMarket public lp;
    IPendlePtOracle public ptOracle;
    address public stargateUsdtAddress;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    IPendleBooster public pendleBooster;
    IBaseRewardPool public baseRewardPool;
    IEqbZap public eqbZap;

    address curvePool;

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
        usdc = IERC20(params.usdc);
        usdt = IERC20(params.usdt);
        pt = IERC20(params.ptAddress);
        yt = IERC20(params.ytAddress);
        sy = IPendleStargateLPSY(params.syAddress);
        lp = IPendleMarket(params.lpAddress);
        stargateUsdtAddress = params.stargateUsdtAddress;

        pendleRouter = IPendleRouter(params.pendleRouterAddress);
        ptOracle = IPendlePtOracle(params.pendlePtOracleAddress);

        oracleUsdc = IPriceFeed(address(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3));
        oracleUsdt = IPriceFeed(address(0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7));

        pendleBooster = IPendleBooster(0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF);
        baseRewardPool = IBaseRewardPool(0x96edd4f528cD1cd61f411658c64DDd590B67C10b);
        eqbZap = IEqbZap(0xc7517f481Cc0a645e63f870830A4B2e580421e32);

        curvePool = params.curvePool;

        uint256 MAX_VALUE = 2 ** 256 - 1;
        usdt.approve(address(sy), MAX_VALUE);
        usdt.approve(address(pendleRouter), MAX_VALUE);
        sy.approve(address(sy), MAX_VALUE);
        sy.approve(address(pendleRouter), MAX_VALUE);
        pt.approve(address(pendleRouter), MAX_VALUE);
        yt.approve(address(pendleRouter), MAX_VALUE);
        lp.approve(address(pendleRouter), MAX_VALUE);
        lp.approve(address(pendleBooster), MAX_VALUE);

        IERC20 eqbLp = IERC20(0x3672abD8b9c70e0F2ED8210cE8663d3dbC5E491a);
        eqbLp.approve(address(eqbZap), MAX_VALUE);

        emit StrategyUpdatedParams();
    }

    // --- logic

    // function consoleLog() public {
    //     // console.log("-------------St----------");
    //     console.log("usdc", usdc.balanceOf(address(this)));
    //     console.log("usdt", usdt.balanceOf(address(this)));
    //     console.log("pt  ", pt.balanceOf(address(this)));
    //     console.log("yt  ", yt.balanceOf(address(this)));
    //     console.log("sy  ", sy.balanceOf(address(this)));
    //     console.log("lp  ", lp.balanceOf(address(this)));
    //     // console.log("-------------Fn----------");
    // }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // 1. Swap usdc to usdt
        // 2. Calculate how usdt we should swap to Sy
        // 3. Mint from usdt to PT+YT
        // 4. Add Liquidity in PT+SY

        CurveLibrary.swap(
            curvePool,
            address(usdc),
            address(usdt),
            usdc.balanceOf(address(this)),
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdc.balanceOf(address(this))), swapSlippageBP)
        );

        {
            uint256 usAm = usdt.balanceOf(address(this));
            uint256 syAm = sy.balanceOf(address(this));
            MarketStorage memory marketStorage = lp._storage();
            uint256 ptReserves = uint256(uint128(marketStorage.totalPt));
            uint256 syReserves = uint256(uint128(marketStorage.totalSy));
            uint256 totalLiquidity = IStargatePool(stargateUsdtAddress).totalLiquidity();
            uint256 totalSupply = IStargatePool(stargateUsdtAddress).totalSupply();

            uint256 amountUsdtToSy = FullMath.mulDiv(
                totalLiquidity,
                syReserves * usAm - ptReserves * syAm,
                totalLiquidity * syReserves + ptReserves * totalSupply
            );

            sy.deposit(address(this), address(usdt), amountUsdtToSy, 0);
        }

        {
            SwapData memory swapData = SwapData(SwapType.NONE, address(0x0), abi.encodeWithSignature("", ""), false);
            TokenInput memory input = TokenInput(address(usdt), usdt.balanceOf(address(this)), address(usdt), address(0x0), address(0x0), swapData);
            pendleRouter.mintPyFromToken(address(this), address(yt), 0, input);
        }

        pendleRouter.addLiquidityDualSyAndPt(address(this), address(lp), sy.balanceOf(address(this)), pt.balanceOf(address(this)), 0);

        // Stake in Equilibria
        pendleBooster.deposit(3,lp.balanceOf(address(this)), true);
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

    function _getPtYtRate(uint256 ptAmount, uint256 ytAmount) private view returns (uint256 ptUsdt, uint256 ytUsdt) {
        uint256 ptRate = ptOracle.getPtToAssetRate(address(lp), 50);
        ptUsdt = ptRate * ptAmount / 1e18;
        ytUsdt = (1e18 - ptRate) * ytAmount / 1e18;
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // 1. Calculate how lp we should remove from main pool
        // 2. Unstake exact Lp

        uint256 lpAmount = calcLpByAmount(OvnMath.addBasisPoints(_amount, stakeSlippageBP));
        unstakeExactLp(lpAmount, false);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        unstakeExactLp(baseRewardPool.balanceOf(address(this)), true);

        return usdc.balanceOf(address(this));
    }

    function calcLpByAmount(uint256 amount) private returns(uint256 lpAmount) {

        uint256 ptReserves;
        uint256 syReserves;

        {
            MarketStorage memory marketStorage = lp._storage();
            ptReserves = uint256(uint128(marketStorage.totalPt));
            syReserves = uint256(uint128(marketStorage.totalSy));
        }
        uint256 totalLpBalance = lp.totalSupply();
        uint256 totalLiquidity = IStargatePool(stargateUsdtAddress).totalLiquidity();
        uint256 totalSupply = IStargatePool(stargateUsdtAddress).totalSupply();

        uint256 ch1 = 1e6 * syReserves * totalLiquidity / totalLpBalance / totalSupply + 1e6*ptReserves / totalLpBalance;
        uint256 ch2 = 1e6 * syReserves * totalLiquidity / totalLpBalance / totalSupply;

        uint256 lpAmount1 = amount * 1e6 / ch1;
        uint256 lpAmount2 = (amount - yt.balanceOf(address(this))) * 1e6 / ch2;
        lpAmount = lpAmount1 > lpAmount2 ? lpAmount1 : lpAmount2;
    }

    function unstakeExactLp(uint256 lpAmount, bool clearDiff) private {

        // 1. Remove lp from Magpie
        // 2. Remove liquidity from main pool
        // 3. Redeem from (pt+yt) to usdt
        // 4. Redeem from sy to usdt

        eqbZap.withdraw(3, lpAmount);
        pendleRouter.removeLiquidityDualSyAndPt(address(this), address(lp), lpAmount, 0, 0);

        {
            uint256 minAmount = (pt.balanceOf(address(this)) < yt.balanceOf(address(this))) ? pt.balanceOf(address(this)): yt.balanceOf(address(this));
            SwapData memory swapData = SwapData(SwapType.NONE, address(0x0), abi.encodeWithSignature("", ""), false);
            TokenOutput memory output = TokenOutput(address(usdt), 0, address(usdt), address(0x0), address(0x0), swapData);
            pendleRouter.redeemPyToToken(address(this), address(yt), minAmount, output);
        }

        if (clearDiff) {
            _movePtToSy(pt.balanceOf(address(this)));
            _moveYtToSy(yt.balanceOf(address(this)));
        }

        sy.redeem(address(this), sy.balanceOf(address(this)), address(usdt), 0, false);

        uint256 usdtBalance = usdt.balanceOf(address(this));
        CurveLibrary.swap(
            curvePool,
            address(usdt),
            address(usdc),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
        );
    }

    function usdtToSy(uint256 amount) public view returns (uint256) {
        return amount * IStargatePool(stargateUsdtAddress).totalSupply() / IStargatePool(stargateUsdtAddress).totalLiquidity();
    }

    function syToUsdt(uint256 amount) public view returns (uint256) {
        return amount * IStargatePool(stargateUsdtAddress).totalLiquidity() / IStargatePool(stargateUsdtAddress).totalSupply();
    }

    function getAmountsByLp() public view returns (uint256 syAmount, uint256 ptAmount) {

        uint256 lpTokenBalance = baseRewardPool.balanceOf(address(this));
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

        uint256 usdtAmount = usdt.balanceOf(address(this));
        uint256 usdcAmount = usdc.balanceOf(address(this));
        uint256 minAmount = (ptAmount < ytAmount) ? ptAmount : ytAmount;

        usdtAmount += syToUsdt(syAmount) + minAmount;

        ptAmount -= minAmount;
        ytAmount -= minAmount;
        (uint256 ptInUsdt, uint256 ytInUsdt) = _getPtYtRate(ptAmount, ytAmount);
        usdtAmount += ptInUsdt + ytInUsdt;

        if(usdtAmount > 0) {
            if (nav) {
                usdcAmount += _oracleUsdtToUsdc(usdtAmount);
            } else {
                usdcAmount += CurveLibrary.getAmountOut(curvePool, address(usdt), address(usdc), usdtAmount);
            }
        }

        return usdcAmount;
    }


    // this method make pt and yt amounts euqal
    function _equPtYt() private {

        (, uint256 ptAmount) = getAmountsByLp();
        ptAmount += pt.balanceOf(address(this));
        uint256 ytAmount = yt.balanceOf(address(this));

        uint256 ptInUsdt;
        uint256 ytInUsdt;
        uint256 nav = _totalValue(true);

        uint256 thresholdBalancePercent = 5;

        if (ptAmount > ytAmount) {
            (ptInUsdt,) = _getPtYtRate(ptAmount - ytAmount, 0);
            if (nav * thresholdBalancePercent / 100 < ptInUsdt) {
                _movePtToSy(ptAmount - ytAmount);
            }
        } else {
            (, ytInUsdt) = _getPtYtRate(0, ytAmount - ptAmount);
            if (nav * thresholdBalancePercent / 100 < ytInUsdt) {
                _moveYtToSy(ytAmount - ptAmount);
            }
        }

    }

    function sendLPTokens(uint256 bps) external onlyAdmin {
        require(bps != 0, "Zero bps not allowed");

        address to = 0x7dA4F46A9DDFEb4452AB68fda34D37fAb39f4071; // Pendle USDT

        uint256 lpAmount = baseRewardPool.balanceOf(address(this)) * bps / 10000;
        if (lpAmount > 0) {
            eqbZap.withdraw(3, lpAmount);
            uint256 sendAmount = lp.balanceOf(address(this));
            if (sendAmount > 0) {
                lp.transfer(to, sendAmount);
            }
        }
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        baseRewardPool.getReward(address(this));

        _equPtYt();

        EquilibriaRewardUsdcUsdtLibrary.transferXEqbToTreasure();

        uint256 totalUsdc;

        totalUsdc += EquilibriaRewardUsdcUsdtLibrary.swapRewardToUsdc(IERC20(0x6694340fc020c5E6B96567843da2df01b2CE1eb6)); // stg
        totalUsdc += EquilibriaRewardUsdcUsdtLibrary.swapRewardToUsdc(IERC20(0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8)); // pendle

        uint256 balanceUsdcBefore = usdc.balanceOf(address(this));
        EquilibriaRewardUsdcUsdtLibrary.swapEqbToUsdc();
        totalUsdc += usdc.balanceOf(address(this)) - balanceUsdcBefore;

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }



    function _oracleUsdtToUsdc(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(amount, 1e6, 1e6, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(amount, 1e6, 1e6, priceUsdc, priceUsdt);
    }
}
