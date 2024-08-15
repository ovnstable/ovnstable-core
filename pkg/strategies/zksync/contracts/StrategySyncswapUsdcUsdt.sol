// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/connectors/contracts/stuff/Syncswap.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "hardhat/console.sol";

contract StrategySyncswapUsdcUsdt is Strategy {

    // --- params

    IERC20 public usdc;
    IERC20 public usdt;

    IRouter public router;
    IStablePool public pool;

    IPriceFeed public oracleUsdc;
    IPriceFeed public oracleUsdt;

    uint256 public usdcDm;
    uint256 public usdtDm;

    
    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address usdt;
        address router;
        address pool;
        address oracleUsdc;
        address oracleUsdt;
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

        router = IRouter(params.router);
        pool = IStablePool(params.pool);

        oracleUsdc = IPriceFeed(params.oracleUsdc);
        oracleUsdt = IPriceFeed(params.oracleUsdt);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdtDm = 10 ** IERC20Metadata(params.usdt).decimals();

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {

        // swap all usdt for calculation
        uint256 usdtBalance = usdt.balanceOf(address(this));
        console.log("usdtBalance: ", usdtBalance);
        if (usdtBalance > 1e6) {
            uint256 amountOut = SyncswapLibrary.getAmountOut(address(pool), address(usdt), usdtBalance, address(this));
            if (amountOut > 0) {
                SyncswapLibrary.swap(
                    address(router),
                    address(pool),
                    address(usdt),
                    address(usdc),
                    usdtBalance,
                    OvnMath.subBasisPoints(amountOut, swapSlippageBP),
                    address(this)
                );
            }
        }

        // calculate and swap usdc to usdt
        uint256 usdcBalance = usdc.balanceOf(address(this));
        console.log("usdcBalance: ", usdcBalance);
        address token0 = pool.token0();
        address token1 = pool.token1();
        console.log("token0: ", token0);
        console.log("token1: ", token1);
        (uint256 reserveUsdc, uint256 reserveUsdt) = pool.getReserves();
        console.log("reserveUsdc: ", reserveUsdc);
        console.log("reserveUsdt: ", reserveUsdt);
        uint256 usdcToSwap = _calcForStake(usdcBalance, reserveUsdc, reserveUsdt);
        console.log("usdcToSwap: ", usdcToSwap);
        uint256 amountOut = SyncswapLibrary.getAmountOut(address(pool), address(usdc), usdcToSwap, address(this));
        console.log("amountOut: ", amountOut);
        if (amountOut > 0) {
            SyncswapLibrary.swap(
                address(router),
                address(pool),
                address(usdc),
                address(usdt),
                usdcToSwap,
                OvnMath.subBasisPoints(amountOut, swapSlippageBP),
                address(this)
            );
        }

        usdcBalance = usdc.balanceOf(address(this));
        console.log("usdcBalance: ", usdcBalance);
        usdtBalance = usdt.balanceOf(address(this));
        console.log("usdtBalance: ", usdtBalance);

        IRouter.TokenInput[] memory inputs = new IRouter.TokenInput[](2);
        inputs[0].token = address(usdc);
        inputs[0].amount = usdcBalance;
        inputs[1].token = address(usdt);
        inputs[1].amount = usdtBalance;

        usdc.approve(address(router), usdcBalance);
        usdt.approve(address(router), usdtBalance);

        // add liquidity
        router.addLiquidity(
            address(pool),
            inputs,
            abi.encodePacked(address(this)),
            0,
            address(0x0),
            "0x"
        );
        console.log("usdcBalance: ", usdc.balanceOf(address(this)));
        console.log("usdtBalance: ", usdt.balanceOf(address(this)));

        uint256 lpTokenBalance = pool.balanceOf(address(this));
        console.log("lpTokenBalance: ", lpTokenBalance);
    }

    function _unstake(
        address _asset,
        uint256 _amount,
        address _beneficiary
    ) internal override returns (uint256) {

        // calculate amount LP to burn
        (uint256 reserveUsdc, uint256 reserveUsdt) = pool.getReserves();
        console.log("reserveUsdc: ", reserveUsdc);
        console.log("reserveUsdt: ", reserveUsdt);
        uint256 totalLpBalance = pool.totalSupply();
        console.log("totalLpBalance: ", totalLpBalance);
        uint256 lpTokenBalance = pool.balanceOf(address(this));
        console.log("lpTokenBalance: ", lpTokenBalance);
        uint256 amountLp = _calcForUnstake(OvnMath.addBasisPoints(_amount, 1), reserveUsdc, reserveUsdt, totalLpBalance, lpTokenBalance);
        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }
        console.log("amountLp: ", amountLp);

        uint256 amountUsdc = reserveUsdc * amountLp / totalLpBalance;
        uint256 amountUsdt = reserveUsdt * amountLp / totalLpBalance;
        console.log("amountUsdc: ", amountUsdc);
        console.log("amountUsdt: ", amountUsdt);

        // calculate minAmounts
        uint[] memory minAmounts = new uint[](2);
        minAmounts[0] = OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP);
        minAmounts[1] = OvnMath.subBasisPoints(amountUsdt, stakeSlippageBP);

        pool.approve(address(router), amountLp);

        // burn liquidity
        router.burnLiquidity(
            address(pool),
            amountLp,
            abi.encodePacked(address(this)),
            minAmounts,
            address(0x0),
            "0x"
        );

        // swap all usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        console.log("usdtBalance: ", usdtBalance);
        uint256 amountOut = SyncswapLibrary.getAmountOut(address(pool), address(usdt), usdtBalance, address(this));
        console.log("amountOut: ", amountOut);
        if (amountOut > 0) {
            SyncswapLibrary.swap(
                address(router),
                address(pool),
                address(usdt),
                address(usdc),
                usdtBalance,
                OvnMath.subBasisPoints(amountOut, swapSlippageBP),
                address(this)
            );
        }
        console.log("usdtBalance: ", usdt.balanceOf(address(this)));

        console.log("usdcBalance: ", usdc.balanceOf(address(this)));
        return usdc.balanceOf(address(this));
    }

    function _unstakeFull(
        address _asset,
        address _beneficiary
    ) internal override returns (uint256) {

        uint256 lpTokenBalance = pool.balanceOf(address(this));
        console.log("lpTokenBalance: ", lpTokenBalance);
        if (lpTokenBalance == 0) {
            return usdc.balanceOf(address(this));
        }

        uint256 totalLpBalance = pool.totalSupply();
        console.log("totalLpBalance: ", totalLpBalance);
        (uint256 reserveUsdc, uint256 reserveUsdt) = pool.getReserves();
        console.log("reserveUsdc: ", reserveUsdc);
        console.log("reserveUsdt: ", reserveUsdt);
        uint256 amountUsdc = reserveUsdc * lpTokenBalance / totalLpBalance;
        uint256 amountUsdt = reserveUsdt * lpTokenBalance / totalLpBalance;
        console.log("amountUsdc: ", amountUsdc);
        console.log("amountUsdt: ", amountUsdt);

        // calculate minAmounts
        uint[] memory minAmounts = new uint[](2);
        minAmounts[0] = OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP);
        minAmounts[1] = OvnMath.subBasisPoints(amountUsdt, stakeSlippageBP);

        pool.approve(address(router), lpTokenBalance);

        // burn liquidity
        router.burnLiquidity(
            address(pool),
            lpTokenBalance,
            abi.encodePacked(address(this)),
            minAmounts,
            address(0x0),
            "0x"
        );

        // swap all usdt to usdc
        uint256 usdtBalance = usdt.balanceOf(address(this));
        console.log("usdtBalance: ", usdtBalance);
        uint256 amountOut = SyncswapLibrary.getAmountOut(address(pool), address(usdt), usdtBalance, address(this));
        console.log("amountOut: ", amountOut);
        if (amountOut > 0) {
            SyncswapLibrary.swap(
                address(router),
                address(pool),
                address(usdt),
                address(usdc),
                usdtBalance,
                OvnMath.subBasisPoints(amountOut, swapSlippageBP),
                address(this)
            );
        }
        console.log("usdtBalance: ", usdt.balanceOf(address(this)));

        console.log("usdcBalance: ", usdc.balanceOf(address(this)));
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
        console.log("usdcBalance: ", usdcBalance);
        console.log("usdtBalance: ", usdtBalance);

        uint256 lpTokenBalance = pool.balanceOf(address(this));
        console.log("lpTokenBalance: ", lpTokenBalance);
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = pool.totalSupply();
            (uint256 reserveUsdc, uint256 reserveUsdt) = pool.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            usdtBalance += reserveUsdt * lpTokenBalance / totalLpBalance;
        }
        console.log("usdcBalance: ", usdcBalance);
        console.log("usdtBalance: ", usdtBalance);

        uint256 usdcBalanceFromUsdt;
        if (usdtBalance > 0) {
            if (nav) {
                usdcBalanceFromUsdt = _oracleUsdtToUsdc(usdtBalance);
            } else {
                usdcBalanceFromUsdt = SyncswapLibrary.getAmountOut(address(pool), address(usdt), usdtBalance, address(this));
            }
        }
        console.log("usdcBalanceFromUsdt: ", usdcBalanceFromUsdt);

        console.log("totalValue: ", usdcBalance + usdcBalanceFromUsdt);
        return usdcBalance + usdcBalanceFromUsdt;
    }

    function _claimRewards(address _to) internal override returns (uint256) {
        return 0;
    }

    function _calcForStake(uint256 am, uint256 res0, uint256 res1) internal returns (uint256) {
        uint256 l = 4 * am / 10;
        uint256 r = 6 * am / 10;

        for (uint256 i = 0; i < 10; i++) {
            uint256 pred = (l + r) / 2;
            if (SyncswapLibrary.getAmountOut(address(pool), address(usdc), pred, address(this)) * (am + res0) + pred * res1 > am * res1) {
                r = pred;
            } else {
                l = pred;
            }
        }

        return r;
    }

    function _calcForUnstake(uint256 am, uint256 res0, uint256 res1, uint256 totalLP, uint256 currentLP) internal returns (uint256) {
        uint256 l = 0;
        uint256 r = currentLP;
        uint256 pred = (l + r) / 2;

        for (uint256 i = 0; i < 10; i++) {
            uint256 pred = (l + r) / 2;
            if (res0 * pred / totalLP + SyncswapLibrary.getAmountOut(address(pool), address(usdt), res1 * pred / totalLP, address(this)) > am) {
                r = pred;
            } else {
                l = pred;
            }
        }

        return r;
    }

    function _oracleUsdcToUsdt(uint256 usdcAmount) internal view returns (uint256) {
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        return ChainlinkLibrary.convertTokenToToken(usdcAmount, usdcDm, usdtDm, priceUsdc, priceUsdt);
    }

    function _oracleUsdtToUsdc(uint256 usdtAmount) internal view returns (uint256) {
        uint256 priceUsdc = ChainlinkLibrary.getPrice(oracleUsdc);
        uint256 priceUsdt = ChainlinkLibrary.getPrice(oracleUsdt);
        return ChainlinkLibrary.convertTokenToToken(usdtAmount, usdtDm, usdcDm, priceUsdt, priceUsdc);
    }

}
