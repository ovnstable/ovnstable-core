// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "@overnight-contracts/connectors/contracts/stuff/Pendle.sol";
import "@overnight-contracts/connectors/contracts/stuff/Magpie.sol";

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
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(weth),
            address(wstEth),
            100, // fee 0.01%
            address(this),
            wethBalance,
            OvnMath.subBasisPoints(_oracleWethToWstEth(wethBalance), swapSlippageBP)
        );

        // 2. Calculate wstEth we should wrap to SY
        uint256 wstEthAmount = wstEth.balanceOf(address(this));
        MarketStorage memory marketStorage = lp._storage();
        uint256 syReserves = uint256(uint128(marketStorage.totalSy));
        uint256 ptReserves = _oracleWethToWstEth(_ptInWeth(uint256(uint128(marketStorage.totalPt))));
        uint256 ptRate = ptOracle.getPtToAssetRate(address(lp), 50);
        uint256 amountWstEthToSy = wstEthAmount * syReserves * ptRate / (syReserves * ptRate + ptReserves * 1e18);

        // 3. Wrap wstEth to SY
        sy.deposit(address(this), address(wstEth), amountWstEthToSy, 0);

        // 4. Mint PT+YT from wstEth
        SwapData memory swapData;
        TokenInput memory input = TokenInput(address(wstEth), wstEth.balanceOf(address(this)), address(wstEth), address(0), address(0), swapData);
        pendleRouter.mintPyFromToken(address(this), address(yt), 0, input);

        // 5. Add Liquidity in SY+PT pool
        pendleRouter.addLiquidityDualSyAndPt(address(this), address(lp), sy.balanceOf(address(this)), pt.balanceOf(address(this)), 0);

        // 6. Stake lp to Magpie
        depositHelperMgp.depositMarket(address(lp), lp.balanceOf(address(this)));
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // 1. Calculate lp we should remove from pool
        uint256 lpTokenBalance = depositHelperMgp.balance(address(lp), address(this));
        uint256 nav = _totalValue(true);
        uint256 lpAmount = OvnMath.addBasisPoints(_amount, stakeSlippageBP) * lpTokenBalance / nav;

        // 2. Unstake exact Lp
        _unstakeExactLp(lpAmount, false);

        return weth.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        // 1. Get all lp
        uint256 lpAmount = depositHelperMgp.balance(address(lp), address(this));

        // 2. Unstake all Lp
        _unstakeExactLp(lpAmount, true);

        return weth.balanceOf(address(this));
    }

    function _unstakeExactLp(uint256 lpAmount, bool unstakeFull) internal {

        // 1. Unstake lp from Magpie
        depositHelperMgp.withdrawMarket(address(lp), lpAmount);

        // 2. Remove liquidity from pool
        pendleRouter.removeLiquidityDualSyAndPt(address(this), address(lp), lpAmount, 0, 0);

        // 3. Redeem PT+YT to wstEth
        uint256 ptBalance = pt.balanceOf(address(this));
        uint256 ytBalance = yt.balanceOf(address(this));
        uint256 minAmount = (ptBalance < ytBalance) ? ptBalance : ytBalance;
        if (minAmount > 0) {
            SwapData memory swapData;
            TokenOutput memory output = TokenOutput(address(wstEth), 0, address(wstEth), address(0), address(0), swapData);
            pendleRouter.redeemPyToToken(address(this), address(yt), minAmount, output);
        }

        // 4. Swap all rest PT adn YT to SY
        if (unstakeFull) {
            _movePtToSy(pt.balanceOf(address(this)));
            _moveYtToSy(yt.balanceOf(address(this)));
        }

        // 5. Redeem SY to wstEth
        sy.redeem(address(this), sy.balanceOf(address(this)), address(wstEth), 0, false);

        // 6. Swap wstEth to weth
        uint256 wstEthBalance = wstEth.balanceOf(address(this));
        UniswapV3Library.singleSwap(
            uniswapV3Router,
            address(wstEth),
            address(weth),
            100, // fee 0.01%
            address(this),
            wstEthBalance,
            0
        );
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        // 1. Harvest rewards
        depositHelperMgp.harvest(address(lp), 0);

        // 2. Claim rewards
        _claimSpecPnp();

        // 3. Check and make PT and YT amounts equal
//        _equPtYt();

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

        if (ptAmount > ytAmount) {
            uint256 delta = ptAmount - ytAmount;
            if (_ptInWeth(delta) > nav * thresholdBalancePercent / 100) {
                _movePtToSy(delta);
            }
        } else {
            uint256 delta = ytAmount - ptAmount;
            if (_ytInWeth(delta) > nav * thresholdBalancePercent / 100) {
                _moveYtToSy(delta);
            }
        }
    }

    function _getAmountsByLp() internal view returns (uint256 syAmount, uint256 ptAmount) {

        MarketStorage memory marketStorage = lp._storage();
        uint256 syReserves = uint256(uint128(marketStorage.totalSy));
        uint256 ptReserves = uint256(uint128(marketStorage.totalPt));
        uint256 lpTokenBalance = depositHelperMgp.balance(address(lp), address(this));
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

    function _movePtToSy(uint256 ptBalance) internal {
        if (ptBalance > 0) {
            pendleRouter.swapExactPtForSy(address(this), address(lp), ptBalance, 0);
        }
    }

    function _moveYtToSy(uint256 ytBalance) internal {
        if (ytBalance > 0) {
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
        uint256 wstEthAmount = wstEth.balanceOf(address(this));

        (uint256 syAmount, uint256 ptAmount) = _getAmountsByLp();
        syAmount += sy.balanceOf(address(this));
        ptAmount += pt.balanceOf(address(this));
        uint256 ytAmount = yt.balanceOf(address(this));

        uint256 ptInWeth = _ptInWeth(ptAmount);
        uint256 ytInWeth = _ytInWeth(ytAmount);
        wethAmount += ptInWeth + ytInWeth;

        wstEthAmount += syAmount;
        if (wstEthAmount > 0) {
            if (nav) {
                wethAmount += _oracleWstEthToWeth(wstEthAmount);
            } else {
                wethAmount += OvnMath.subBasisPoints(_oracleWstEthToWeth(wstEthAmount), swapSlippageBP);
            }
        }

        return wethAmount;
    }

    // amount * price / wstEth decimals
    function _oracleWstEthToWeth(uint256 amount) internal view returns (uint256) {
        return amount * ChainlinkLibrary.getPrice(oracleWstEthEth) / 1e18;
    }

    // amount * wstEth decimals / price
    function _oracleWethToWstEth(uint256 amount) internal view returns (uint256) {
        uint256 price = ChainlinkLibrary.getPrice(oracleWstEthEth);
        return amount * 1e18 / price;
    }
}
