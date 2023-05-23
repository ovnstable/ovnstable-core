// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";
import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "hardhat/console.sol";


contract StrategyPendleUsdt is Strategy {

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

        address uniswapV3Router;
        address middleToken;
        uint24 poolFeeStg0;
        uint24 poolFeeStg1;
        uint24 poolFeePendle0;
        uint24 poolFeePendle1;

        address curvePool;
        address oracleUsdc;
        address oracleUsdt;

        address stgAddress;
        address pendleAddress;
    }

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public pt;
    IERC20 public yt;

    uint256 public usdcDm;
    uint256 public usdtDm;

    IPendleRouter pendleRouter;
    IPendleStargateLPSY sy;
    IPendleMarket lp;
    address stargateUsdtAddress;

    ISwapRouter public uniswapV3Router;
    address public middleToken;
    uint24 public poolFeeStg0;
    uint24 public poolFeeStg1;
    uint24 public poolFeePendle0;
    uint24 public poolFeePendle1;

    address public curvePool;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    IERC20 public stg;
    IERC20 public pendle;

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

        uniswapV3Router = ISwapRouter(params.uniswapV3Router);
        middleToken = params.middleToken;
        poolFeeStg0 = params.poolFeeStg0;
        poolFeeStg1 = params.poolFeeStg1;
        poolFeePendle0 = params.poolFeePendle0;
        poolFeePendle1 = params.poolFeePendle1;

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        curvePool = params.curvePool;

        stg = IERC20(params.stgAddress);
        pendle = IERC20(params.pendleAddress);

        emit StrategyUpdatedParams();
    }

    // --- logic

    function consoleLog() public {
        
        console.log("-------------St----------");
        console.log("usdc", usdc.balanceOf(address(this)));
        console.log("usdt", usdt.balanceOf(address(this)));
        console.log("pt  ", pt.balanceOf(address(this)));
        console.log("yt  ", yt.balanceOf(address(this)));
        console.log("sy  ", sy.balanceOf(address(this)));
        console.log("lp  ", lp.balanceOf(address(this)));
        console.log("-------------Fn----------");
    }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        MarketStorage memory marketStorage = lp._storage();
        uint256 ptReserves = uint256(uint128(marketStorage.totalPt));
        uint256 syReserves = uint256(uint128(marketStorage.totalSy));

        CurveLibrary.swap(
            curvePool,
            address(usdc),
            address(usdt),
            usdc.balanceOf(address(this)),
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(usdc.balanceOf(address(this))), swapSlippageBP)
        );
        
        uint256 us = usdt.balanceOf(address(this));
        uint256 amountUsdtToSy = (us * syReserves)/(syReserves + ptReserves);
        usdt.approve(address(sy), amountUsdtToSy);
        sy.deposit(address(this), address(usdt), amountUsdtToSy, 0);

        // consoleLog();

        {
            bytes memory bytesQ = abi.encodeWithSignature("", "");
            SwapData memory swapData = SwapData(SwapType.NONE, address(0x0), bytesQ, false);
            TokenInput memory input = TokenInput(address(usdt), usdt.balanceOf(address(this)), address(usdt), address(0x0), address(0x0), swapData);
            usdt.approve(address(pendleRouter), usdt.balanceOf(address(this)));
            pendleRouter.mintPyFromToken(address(this), address(yt), 0, input); 
        }

        // consoleLog();

        // ApproxParams memory approxParams = ApproxParams(pt.balanceOf(address(this)),pt.balanceOf(address(this)),0,8,100000000000000);
        // pt.approve(address(pendleRouter), pt.balanceOf(address(this)));
        // pendleRouter.swapExactPtForYt(address(this), address(lp), pt.balanceOf(address(this)), 0, approxParams); 

        // consoleLog();

        sy.approve(address(pendleRouter), sy.balanceOf(address(this)));
        pt.approve(address(pendleRouter), pt.balanceOf(address(this)));
        pendleRouter.addLiquidityDualSyAndPt(address(this), address(lp), sy.balanceOf(address(this)), pt.balanceOf(address(this)), 0); 

        // consoleLog();
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 lpAmount = calcLpByAmount(_amount);
        unstakeExactLp(lpAmount);

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        unstakeExactLp(lp.balanceOf(address(this)));

        return usdc.balanceOf(address(this));
    }

    function calcLpByAmount(uint256 amount) private returns(uint256 lpAmount) {
        uint256 lpTokenBalance = lp.balanceOf(address(this));
                
        MarketStorage memory marketStorage = lp._storage();
        uint256 ptReserves = uint256(uint128(marketStorage.totalPt));
        
        uint256 syReserves = uint256(uint128(marketStorage.totalSy));
        uint256 totalLpBalance = lp.totalSupply();

        uint256 ch1 = 1e6 * syReserves * IStargatePool(stargateUsdtAddress).totalLiquidity() / totalLpBalance / IStargatePool(stargateUsdtAddress).totalSupply() + 1e6*ptReserves / totalLpBalance;
        uint256 ch2 = 1e6 * syReserves * IStargatePool(stargateUsdtAddress).totalLiquidity() / totalLpBalance / IStargatePool(stargateUsdtAddress).totalSupply();
        
        uint256 lpAmount1 = amount * 1e6 / ch1;
        uint256 lpAmount2 = (amount - yt.balanceOf(address(this))) * 1e6 / ch2;
        lpAmount = lpAmount1 > lpAmount2 ? lpAmount1 : lpAmount2;
    }

    function unstakeExactLp(uint256 lpAmount) private {
        lp.approve(address(pendleRouter), lpAmount);
        pendleRouter.removeLiquidityDualSyAndPt(address(this), address(lp), lpAmount, 0, 0); 

        sy.approve(address(sy), sy.balanceOf(address(this)));
        sy.redeem(address(this), sy.balanceOf(address(this)), address(usdt), 0, false);
        
        uint256 minAmount = (pt.balanceOf(address(this)) < yt.balanceOf(address(this))) ? pt.balanceOf(address(this)): yt.balanceOf(address(this));
        bytes memory bytesQ = abi.encodeWithSignature("", "");
        SwapData memory swapData = SwapData(SwapType.NONE, address(0x0), bytesQ, false);
        TokenOutput memory output = TokenOutput(address(usdt), 0, address(usdt), address(0x0), address(0x0), swapData);
        pt.approve(address(pendleRouter), pt.balanceOf(address(this)));
        yt.approve(address(pendleRouter), yt.balanceOf(address(this)));
        pendleRouter.redeemPyToToken(address(this), address(yt), minAmount, output); 

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
    
        uint256 lpTokenBalance = lp.balanceOf(address(this));
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

        if(usdtAmount > 0) {
            if (nav) {
                usdcAmount += _oracleUsdtToUsdc(usdtAmount);
            } else {
                usdcAmount += CurveLibrary.getAmountOut(curvePool, address(usdt), address(usdc), usdtAmount);
            }
        }

        return usdcAmount;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        address[] memory sys = new address[](1); sys[0] = address(sy);
        address[] memory yts = new address[](1); yts[0] = address(yt);
        address[] memory markets = new address[](1); markets[0] = address(lp);
        pendleRouter.redeemDueInterestAndRewards(address(this), sys, yts, markets);

        uint256 totalUsdc;
        uint256 stgBalance = stg.balanceOf(address(this));
        if (stgBalance > 0) {

            uint256 amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(stg),
                middleToken,
                address(usdc),
                poolFeeStg0,
                poolFeeStg1,
                address(this),
                stgBalance,
                0
            );

            totalUsdc += amountOut;
        }

        uint256 pendleBalance = pendle.balanceOf(address(this));
        if (pendleBalance > 0) {

            uint256 amountOut = UniswapV3Library.multiSwap(
                uniswapV3Router,
                address(pendle),
                middleToken,
                address(usdc),
                poolFeePendle0,
                poolFeePendle1,
                address(this),
                pendleBalance,
                0
            );

            totalUsdc += amountOut;
        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleUsdtToUsdc(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(amount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

    function _oracleUsdcToUsdt(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        return ChainlinkLibrary.convertTokenToToken(amount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }
}
