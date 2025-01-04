// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

import "hardhat/console.sol";

contract StrategyVelodromeUsdcLusd is Strategy {

    IERC20 public usdc;
    IERC20 public lusd;
    IERC20 public susd;
    IERC20 public velo;

    uint256 public usdcDm;
    uint256 public lusdDm;

    IRouter public router;
    IGauge public gauge;
    IPair public pair;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleLusd;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address lusd;
        address susd;
        address velo;
        address router;
        address gauge;
        address pair;
        address oracleUsdc;
        address oracleLusd;
    }


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __Strategy_init();
    }


    // --- Setters

    function setParams(StrategyParams calldata params) external onlyAdmin {
        usdc = IERC20(params.usdc);
        lusd = IERC20(params.lusd);
        susd = IERC20(params.susd);
        velo = IERC20(params.velo);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        lusdDm = 10 ** IERC20Metadata(params.lusd).decimals();

        router = IRouter(params.router);
        gauge = IGauge(params.gauge);
        pair = IPair(params.pair);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleLusd = IPriceFeed(params.oracleLusd);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 reserveUsdc, uint256 reserveLusd,) = pair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveLusd > 10 ** 15, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 lusdBalance = lusd.balanceOf(address(this));

        uint256 usdcAmountIn = VelodromeLibrary.getMultiAmount0(
            router,
            address(usdc),
            address(susd),
            address(lusd),
            usdcBalance,
            true,
            true,
            reserveUsdc,
            reserveLusd,
            usdcDm,
            lusdDm,
            2
        );

        VelodromeLibrary.multiSwap(
            router,
            address(usdc),
            address(susd),
            address(lusd),
            true,
            true,
            usdcAmountIn,
            0,
            address(this)
        );

        usdcBalance = usdc.balanceOf(address(this));
        lusdBalance = lusd.balanceOf(address(this));

        usdc.approve(address(router), usdcBalance);
        lusd.approve(address(router), lusdBalance);

        router.addLiquidity(
            address(usdc),
            address(lusd),
            true,
            usdcBalance,
            lusdBalance,
            OvnMath.subBasisPoints(usdcBalance, stakeSlippageBP),
            OvnMath.subBasisPoints(lusdBalance, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 lpTokenBalance = pair.balanceOf(address(this));
        pair.approve(address(gauge), lpTokenBalance);
        gauge.deposit(lpTokenBalance, 0);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveUsdc, uint256 reserveLusd,) = pair.getReserves();

        VelodromeLibrary.CalculateMultiParams memory params;
        params.velodromeRouter = router;
        params.token0 = address(usdc);
        params.token1 = address(susd);
        params.token2 = address(lusd);
        params.amount0Total = OvnMath.addBasisPoints(_amount + 10, 1);
        params.totalAmountLpTokens = totalLpBalance;
        params.isStable0 = true;
        params.isStable1 = true;
        params.reserve0 = reserveUsdc;
        params.reserve1 = reserveLusd;
        params.denominator0 = usdcDm;
        params.denominator1 = lusdDm;
        params.precision = 1;

        uint256 amountLp = VelodromeLibrary.getAmountLpTokens(params);

        uint256 lpTokenBalance = gauge.balanceOf(address(this));

        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }

        uint256 amountUsdc = reserveUsdc * amountLp / totalLpBalance;
        uint256 amountLusd = reserveLusd * amountLp / totalLpBalance;

        gauge.withdraw(amountLp);

        pair.approve(address(router), amountLp);
        router.removeLiquidity(
            address(usdc),
            address(lusd),
            true,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountLusd, stakeSlippageBP),
            address(this),
            block.timestamp
        );


        uint256 lusdBalance = lusd.balanceOf(address(this));

        VelodromeLibrary.multiSwap(
            router,
            address(lusd),
            address(susd),
            address(usdc),
            true,
            true,
            lusdBalance,
            OvnMath.subBasisPoints(_oracleLusdToUsdc(lusdBalance), swapSlippageBP),
            address(this)
        );

        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 lpTokenBalance = gauge.balanceOf(address(this));

        if (lpTokenBalance == 0) {
            return usdc.balanceOf(address(this));
        }

        gauge.withdraw(lpTokenBalance);

        uint256 totalLpBalance = pair.totalSupply();
        (uint256 reserveUsdc, uint256 reserveLusd,) = pair.getReserves();

        uint256 amountUsdc = reserveUsdc * lpTokenBalance / totalLpBalance;
        uint256 amountLusd = reserveLusd * lpTokenBalance / totalLpBalance;

        pair.approve(address(router), lpTokenBalance);
        router.removeLiquidity(
            address(usdc),
            address(lusd),
            true,
            lpTokenBalance,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountLusd, stakeSlippageBP),
            address(this),
            block.timestamp
        );


        uint256 lusdBalance = lusd.balanceOf(address(this));
        VelodromeLibrary.multiSwap(
            router,
            address(lusd),
            address(susd),
            address(usdc),
            true,
            true,
            lusdBalance,
            OvnMath.subBasisPoints(_oracleLusdToUsdc(lusdBalance), swapSlippageBP),
            address(this)
        );

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
        uint256 lusdBalance = lusd.balanceOf(address(this));

        uint256 lpTokenBalance = gauge.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveUsdc, uint256 reserveLusd,) = pair.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            lusdBalance += reserveLusd * lpTokenBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromLusd;
        if (lusdBalance > 0) {
            if (nav) {
                usdcBalanceFromLusd = _oracleLusdToUsdc(lusdBalance);
            } else {
                usdcBalanceFromLusd = VelodromeLibrary.getAmountsOut(
                    router,
                    address(lusd),
                    address(susd),
                    address(usdc),
                    true,
                    true,
                    lusdBalance
                );
            }
        }

        return usdcBalance + usdcBalanceFromLusd;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        if (gauge.balanceOf(address(this)) == 0) {
            return 0;
        }

        // claim rewards
        address[] memory tokens = new address[](1);
        tokens[0] = address(velo);
        gauge.getReward(address(this), tokens);

        // sell rewards
        uint256 totalUsdc;

        uint256 veloBalance = velo.balanceOf(address(this));
        if (veloBalance > 0) {
            uint256 amountOut = VelodromeLibrary.getAmountsOut(
                router,
                address(velo),
                address(usdc),
                false,
                veloBalance
            );

            if (amountOut > 0) {
                uint256 veloUsdc = VelodromeLibrary.singleSwap(
                    router,
                    address(velo),
                    address(usdc),
                    false,
                    veloBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
                totalUsdc += veloUsdc;
            }

        }

        if (totalUsdc > 0) {
            usdc.transfer(_to, totalUsdc);
        }

        return totalUsdc;
    }

    function _oracleLusdToUsdc(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceLusd = uint256(oracleLusd.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, lusdDm, usdcDm, priceLusd, priceUsdc);
    }

    function _oracleUsdcToLusd(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceLusd = uint256(oracleLusd.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, usdcDm, lusdDm, priceUsdc, priceLusd);
    }
}
