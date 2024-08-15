// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@overnight-contracts/core/contracts/Strategy.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";
import "@overnight-contracts/connectors/contracts/stuff/Chainlink.sol";
import "@overnight-contracts/connectors/contracts/stuff/Curve.sol";
import "@overnight-contracts/connectors/contracts/stuff/Velodrome.sol";

import "hardhat/console.sol";

contract StrategyVelodromeUsdcUsdPlus is Strategy {

    IERC20 public usdc;
    IERC20 public usdp;
    IERC20 public velo;

    uint256 public usdcDm;
    uint256 public usdpDm;

    IRouter public router;
    IGauge public gauge;
    IPair public pair;

    // --- events

    event StrategyUpdatedParams();


    // --- structs

    struct StrategyParams {
        address usdc;
        address usdp;
        address velo;
        address router;
        address gauge;
        address pair;
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
        usdp = IERC20(params.usdp);
        velo = IERC20(params.velo);

        usdcDm = 10 ** IERC20Metadata(params.usdc).decimals();
        usdpDm = 10 ** IERC20Metadata(params.usdp).decimals();

        router = IRouter(params.router);
        gauge = IGauge(params.gauge);
        pair = IPair(params.pair);

        emit StrategyUpdatedParams();
    }


    // --- logic

    function _out0(uint256 am) internal returns (uint256) {
        return VelodromeLibrary.getAmountsOut(
            router,
            address(usdc),
            address(usdp),
            true,
            am
        );
    }

    function _calcForStake(uint256 am, uint256 res0, uint256 res1) internal returns (uint256) {
        uint256 l = 4 * am / 10;
        uint256 r = 6 * am / 10;

        for (uint256 i = 0; i < 10; i++) {
            uint256 pred = (l + r) / 2;
            if (_out0(pred) * (am + res0) + pred * res1 > am * res1) {
                r = pred;
            } else {
                l = pred;
            }
        }
        
        return r;
    }

    function _out1(uint256 am) internal returns (uint256) {
        return VelodromeLibrary.getAmountsOut(
            router,
            address(usdp),
            address(usdc),
            true,
            am
        );
    }

    function _calcForUnstake(uint256 am, uint256 res0, uint256 res1, uint256 totalLP, uint256 currentLP) internal returns (uint256) {
        uint256 l = 0;
        uint256 r = currentLP;
        uint256 pred = (l + r) / 2;

        for (uint256 i = 0; i < 10; i++) {
            uint256 pred = (l + r) / 2;
            if (res0 * pred / totalLP + _out1(res1 * pred / totalLP) > am) {
                r = pred;
            } else {
                l = pred;
            }
        }
        
        return r;
    }

    function _stake(
        address _asset,
        uint256 _amount
    ) internal override {
        // only for tests
        // usdp.transfer(address(router), usdp.balanceOf(address(this)));
        
        (uint256 reserveUsdp, uint256 reserveUsdc,) = pair.getReserves();
        require(reserveUsdc > 10 ** 3 && reserveUsdp > 10 ** 3, 'Liquidity lpToken reserves too low');

        uint256 usdcBalance = usdc.balanceOf(address(this));
        uint256 usdpBalance = usdp.balanceOf(address(this));

        if (usdpBalance > 1e6) {
            uint256 amountOut = VelodromeLibrary.getAmountsOut(
                router,
                address(usdp),
                address(usdc),
                true,
                usdpBalance
            );

            if (amountOut > 0) {
                VelodromeLibrary.singleSwap(
                    router,
                    address(usdp),
                    address(usdc),
                    true,
                    usdpBalance,
                    0,//OvnMath.subBasisPoints(amountOut, swapSlippageBP),
                    address(this)
                );
            }
        }


        uint256 usdcToSwap = _calcForStake(usdcBalance, reserveUsdc, reserveUsdp);

        uint256 amountOut = VelodromeLibrary.getAmountsOut(
            router,
            address(usdc),
            address(usdp),
            true,
            usdcToSwap
        );
        if (amountOut > 0) {
            VelodromeLibrary.singleSwap(
                router,
                address(usdc),
                address(usdp),
                true,
                usdcToSwap,
                0,//OvnMath.subBasisPoints(amountOut, swapSlippageBP),
                address(this)
            );
        }

        usdcBalance = usdc.balanceOf(address(this));
        usdpBalance = usdp.balanceOf(address(this));

        usdc.approve(address(router), usdcBalance);
        usdp.approve(address(router), usdpBalance);

        router.addLiquidity(
            address(usdc),
            address(usdp),
            true,
            usdcBalance,
            usdpBalance,
            0,//OvnMath.subBasisPoints(usdcBalance, stakeSlippageBP),
            0,//OvnMath.subBasisPoints(usdpBalance, stakeSlippageBP),
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
        (uint256 reserveUsdp, uint256 reserveUsdc,) = pair.getReserves();

        uint256 lpTokenBalance = gauge.balanceOf(address(this));
        uint256 amountLp = _calcForUnstake(OvnMath.addBasisPoints(_amount, 1), reserveUsdc, reserveUsdp, totalLpBalance, lpTokenBalance);

        if (amountLp > lpTokenBalance) {
            amountLp = lpTokenBalance;
        }

        uint256 amountUsdc = reserveUsdc * amountLp / totalLpBalance;
        uint256 amountUsdp = reserveUsdp * amountLp / totalLpBalance;

        gauge.withdraw(amountLp);

        pair.approve(address(router), amountLp);
        router.removeLiquidity(
            address(usdc),
            address(usdp),
            true,
            amountLp,
            0,//OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            0,//OvnMath.subBasisPoints(amountUsdp, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 usdpBalance = usdp.balanceOf(address(this));

        uint256 amountOut = VelodromeLibrary.getAmountsOut(
            router,
            address(usdp),
            address(usdc),
            true,
            usdpBalance
        );

        if (amountOut > 0) {
            VelodromeLibrary.singleSwap(
                router,
                address(usdp),
                address(usdc),
                true,
                usdpBalance,
                0,//OvnMath.subBasisPoints(amountOut, swapSlippageBP),
                address(this)
            );
        }

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
        (uint256 reserveUsdc, uint256 reserveUsdp,) = pair.getReserves();

        uint256 amountUsdc = reserveUsdc * lpTokenBalance / totalLpBalance;
        uint256 amountUsdp = reserveUsdp * lpTokenBalance / totalLpBalance;

        pair.approve(address(router), lpTokenBalance);
        router.removeLiquidity(
            address(usdc),
            address(usdp),
            true,
            lpTokenBalance,
            0,//OvnMath.subBasisPoints(amountUsdc, stakeSlippageBP),
            0,//OvnMath.subBasisPoints(amountUsdp, stakeSlippageBP),
            address(this),
            block.timestamp
        );

        uint256 usdpBalance = usdp.balanceOf(address(this));

        uint256 amountOut = VelodromeLibrary.getAmountsOut(
            router,
            address(usdp),
            address(usdc),
            true,
            usdpBalance
        );
        if (amountOut > 0) {
            VelodromeLibrary.singleSwap(
                router,
                address(usdp),
                address(usdc),
                true,
                usdpBalance,
                0,//OvnMath.subBasisPoints(amountOut, swapSlippageBP),
                address(this)
            );
        }

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
        uint256 usdpBalance = usdp.balanceOf(address(this));

        uint256 lpTokenBalance = gauge.balanceOf(address(this));
        if (lpTokenBalance > 0) {
            uint256 totalLpBalance = pair.totalSupply();
            (uint256 reserveUsdc, uint256 reserveUsdp,) = pair.getReserves();
            usdcBalance += reserveUsdc * lpTokenBalance / totalLpBalance;
            usdpBalance += reserveUsdp * lpTokenBalance / totalLpBalance;
        }

        uint256 usdcBalanceFromUsdp;
        if (usdpBalance > 0) {
            if (nav) {
                usdcBalanceFromUsdp = usdpBalance;
            } else {
                usdcBalanceFromUsdp = VelodromeLibrary.getAmountsOut(router, address(usdp), address(usdc), true, usdpBalance);
            }
        }

        return usdcBalance + usdcBalanceFromUsdp;
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
}
