// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

import "hardhat/console.sol";

contract StrategyVelodromeUsdcDai is Strategy {

    IERC20 public usdc;
    IERC20 public dai;
    IERC20 public velo;

    uint256 public usdcDm;
    uint256 public daiDm;

    IRouter public router;
    IGauge public gauge;
    IPair public pair;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleDai;

    address public curve3Pool;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address dai;
        address velo;
        address router;
        address gauge;
        address pair;
        address oracleUsdc;
        address oracleDai;
        address curvePool;
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
        dai = IERC20(params.dai);
        velo = IERC20(params.velo);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        daiDm = 10 ** IERC20Metadata(params.dai).decimals();

        router = IRouter(params.router);
        gauge = IGauge(params.gauge);
        pair = IPair(params.pair);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleDai = IPriceFeed(params.oracleDai);

        curve3Pool = params.curvePool;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 reserveUsdc, uint256 reserveDai,) = pair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveDai > 10 ** 15, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 daiBalance = dai.balanceOf(address(this));

        uint256 amountUsdcIn = CurveLibrary.getAmountToSwap(
            curve3Pool,
            address(usdc),
            address(dai),
            usdcBalance,
            reserveUsdc,
            reserveDai,
            usdcDm,
            daiDm,
            1
        );

        CurveLibrary.swap(
            curve3Pool,
            address(usdc),
            address(dai),
            amountUsdcIn,
            OvnMath.subBasisPoints(_oracleUsdcToDai(amountUsdcIn), swapSlippageBP)
        );

        usdcBalance = usdc.balanceOf(address(this));
        daiBalance = dai.balanceOf(address(this));

        usdc.approve(address(router), usdcBalance);
        dai.approve(address(router), daiBalance);

        router.addLiquidity(
            address(usdc),
            address(dai),
            true,
            usdcBalance,
            daiBalance,
            OvnMath.subBasisPoints(usdcBalance, stakeSlippageBP),
            OvnMath.subBasisPoints(daiBalance, stakeSlippageBP),
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
        (uint256 reserveUsdc, uint256 reserveDai,) = pair.getReserves();

        uint256 amountLp = CurveLibrary.getAmountLpTokens(
            curve3Pool,
            address(usdc),
            address(dai),
            OvnMath.addBasisPoints(_amount + 10, 1),
            totalLpBalance,
            reserveUsdc,
            reserveDai,
            usdcDm,
            daiDm,
            1
        );

        uint256 lpTokenBalance = gauge.balanceOf(address(this));

        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }

        uint256 amountUsdc = reserveUsdc * amountLp / totalLpBalance;
        uint256 amountDai = reserveDai * amountLp / totalLpBalance;

        gauge.withdraw(amountLp);

        pair.approve(address(router), amountLp);
        router.removeLiquidity(
            address(usdc),
            address(dai),
            true,
            amountLp,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 daiBalance = dai.balanceOf(address(this));

        CurveLibrary.swap(
            curve3Pool,
            address(dai),
            address(usdc),
            daiBalance,
            OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP)
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
        (uint256 reserveUsdc, uint256 reserveDai,) = pair.getReserves();

        uint256 amountUsdc = reserveUsdc * lpTokenBalance / totalLpBalance;
        uint256 amountDai = reserveDai * lpTokenBalance / totalLpBalance;

        pair.approve(address(router), lpTokenBalance);
        router.removeLiquidity(
            address(usdc),
            address(dai),
            true,
            lpTokenBalance,
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            OvnMath.subBasisPoints(amountDai, stakeSlippageBP),
            address(this),
            block.timestamp
        );


        uint256 daiBalance = dai.balanceOf(address(this));
        CurveLibrary.swap(
            curve3Pool,
            address(dai),
            address(usdc),
            daiBalance,
            OvnMath.subBasisPoints(_oracleDaiToUsdc(daiBalance), swapSlippageBP)
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
        uint256 daiBalance = dai.balanceOf(address(this));

        uint256 lpTokenBalance = gauge.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveUsdc, uint256 reserveDai,) = pair.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            daiBalance += reserveDai * lpTokenBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromDai;
        if (daiBalance > 0) {
            if (nav) {
                usdcBalanceFromDai = _oracleDaiToUsdc(daiBalance);
            } else {
                usdcBalanceFromDai = CurveLibrary.getAmountOut(curve3Pool, address(dai), address(usdc), daiBalance);
            }
        }

        return usdcBalance + usdcBalanceFromDai;
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

    function _oracleDaiToUsdc(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, daiDm, usdcDm, priceDai, priceUsdc);
    }

    function _oracleUsdcToDai(uint256 amount) internal view returns (uint256) {
        uint256 priceUsdc = uint256(oracleUsdc.latestAnswer());
        uint256 priceDai = uint256(oracleDai.latestAnswer());
        return ChainlinkLibrary.convertTokenToToken(amount, usdcDm, daiDm, priceUsdc, priceDai);
    }
}
