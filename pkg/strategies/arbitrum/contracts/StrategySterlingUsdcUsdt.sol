// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sterling.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";

import "hardhat/console.sol";

contract StrategySterlingUsdcUsdt is Strategy {

    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public str;

    uint256 public usdcDm;
    uint256 public usdtDm;

    ISterlingRouter public router;
    ISterlingGauge public gauge;
    ISterlingPair public pair;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    address public curvePool;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address str;
        address router;
        address gauge;
        address pair;
        address oracleUsdc;
        address oracleUsdt;
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
        usdt = IERC20(params.usdt);
        str = IERC20(params.str);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        router = ISterlingRouter(params.router);
        gauge = ISterlingGauge(params.gauge);
        pair = ISterlingPair(params.pair);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        curvePool = params.curvePool;

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        (uint256 reserveUsdt, uint256 reserveUsdc,) = pair.getReserves();
        require(reserveUsdt > 10 ** 3 && reserveUsdc > 10 ** 3, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 amountUsdcIn = CurveLibrary.getAmountToSwap(
            curvePool,
            address(usdc),
            address(usdt),
            usdcBalance,
            reserveUsdc,
            reserveUsdt,
            usdcDm,
            usdtDm,
            1
        );

        CurveLibrary.swap(
            curvePool,
            address(usdc),
            address(usdt),
            amountUsdcIn,
            OvnMath.subBasisPoints(_oracleUsdcToUsdt(amountUsdcIn), swapSlippageBP)
        );

        usdcBalance = usdc.balanceOf(address(this));
        usdtBalance = usdt.balanceOf(address(this));

        usdc.approve(address(router), usdcBalance);
        usdt.approve(address(router), usdtBalance);

        router.addLiquidity(
            address(usdt),
            address(usdc),
            true,
            usdtBalance,
            usdcBalance,
            OvnMath.subBasisPoints(usdtBalance, stakeSlippageBP),
            OvnMath.subBasisPoints(usdcBalance, stakeSlippageBP),
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
        (uint256 reserveUsdt, uint256 reserveUsdc,) = pair.getReserves();

        uint256 amountLp = CurveLibrary.getAmountLpTokens(
            curvePool,
            address(usdc),
            address(usdt),
            OvnMath.addBasisPoints(_amount + 10, 1),
            totalLpBalance,
            reserveUsdc,
            reserveUsdt,
            usdcDm,
            usdtDm,
            1
        );

        uint256 lpTokenBalance = gauge.balanceOf(address(this));

        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }

        uint256 amountUsdc = reserveUsdc * amountLp / totalLpBalance;
        uint256 amountUsdt = reserveUsdt * amountLp / totalLpBalance;

        gauge.withdraw(amountLp);

        pair.approve(address(router), amountLp);
        router.removeLiquidity(
            address(usdt),
            address(usdc),
            true,
            amountLp,
            OvnMath.subBasisPoints(amountUsdt, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 usdtBalance = usdt.balanceOf(address(this));

        CurveLibrary.swap(
            curvePool,
            address(usdt),
            address(usdc),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
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
        (uint256 reserveUsdt, uint256 reserveUsdc,) = pair.getReserves();

        uint256 amountUsdc = reserveUsdc * lpTokenBalance / totalLpBalance;
        uint256 amountUsdt = reserveUsdt * lpTokenBalance / totalLpBalance;

        pair.approve(address(router), lpTokenBalance);
        router.removeLiquidity(
            address(usdt),
            address(usdc),
            true,
            lpTokenBalance,
            OvnMath.subBasisPoints(amountUsdt, stakeSlippageBP),
            OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            address(this),
            block.timestamp
        );


        uint256 usdtBalance = usdt.balanceOf(address(this));
        CurveLibrary.swap(
            curvePool,
            address(usdt),
            address(usdc),
            usdtBalance,
            OvnMath.subBasisPoints(_oracleUsdtToUsdc(usdtBalance), swapSlippageBP)
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
        uint256 usdtBalance = usdt.balanceOf(address(this));

        uint256 lpTokenBalance = gauge.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveUsdt, uint256 reserveUsdc,) = pair.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            usdtBalance += reserveUsdt * lpTokenBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromUsdt;
        if (usdtBalance > 0) {
            if (nav) {
                usdcBalanceFromUsdt = _oracleUsdtToUsdc(usdtBalance);
            } else {
                usdcBalanceFromUsdt = CurveLibrary.getAmountOut(curvePool, address(usdt), address(usdc), usdtBalance);
            }
        }

        return usdcBalance + usdcBalanceFromUsdt;
    }

    function _claimRewards(address _to) internal override returns (uint256) {

        if (gauge.balanceOf(address(this)) == 0) {
            return 0;
        }

        // claim rewards
        address[] memory tokens = new address[](1);
        tokens[0] = address(str);
        gauge.getReward(address(this), tokens);

        // sell rewards
        uint256 totalUsdc;

        uint256 strBalance = str.balanceOf(address(this));
        if (strBalance > 0) {
            uint256 amountOut = SterlingLibrary.getAmountsOut(
                router,
                address(str),
                address(usdc),
                false,
                strBalance
            );

            if (amountOut > 0) {
                uint256 strUsdc = SterlingLibrary.singleSwap(
                    router,
                    address(str),
                    address(usdc),
                    false,
                    strBalance,
                    amountOut * 99 / 100,
                    address(this)
                );
                totalUsdc += strUsdc;
            }

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
