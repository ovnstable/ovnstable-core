// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../GlobalPayoutListener.sol";
import "@overnight-contracts/connectors/contracts/stuff/DefiEdge.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "hardhat/console.sol";

contract OptimismPayoutListener is GlobalPayoutListener {

    IDefiEdgeTwapStrategy.NewTick[] private defiEdgeTicks;

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    function optimism() external {
    }

    function _customUndone(Item memory item) internal override {

        if (keccak256(bytes(item.dexName)) == keccak256(bytes('DefiEdge'))) {

            IDefiEdgeTwapStrategy defiEdgeTwapStrategy = IDefiEdgeTwapStrategy(item.pool);
            IUniswapV3Pool pool = IUniswapV3Pool(defiEdgeTwapStrategy.pool());

            uint256 amount0 = IERC20(pool.token0()).balanceOf(address(defiEdgeTwapStrategy));
            uint256 amount1 = IERC20(pool.token1()).balanceOf(address(defiEdgeTwapStrategy));
            console.log("amount0 before: %s", amount0);
            console.log("amount1 before: %s", amount1);

            delete defiEdgeTicks;
            IDefiEdgeTwapStrategy.Tick[] memory ticks = defiEdgeTwapStrategy.getTicks();
            for (uint8 i = 0; i < ticks.length; i++) {
                int24 tickLower = ticks[i].tickLower;
                int24 tickUpper = ticks[i].tickUpper;
                (uint128 liquidity, , , , ) = pool.positions(PositionKey.compute(address(defiEdgeTwapStrategy), tickLower, tickUpper));
                (uint160 sqrtRatioX96, , , , , , ) = pool.slot0();
                (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
                    sqrtRatioX96,
                    TickMath.getSqrtRatioAtTick(tickLower),
                    TickMath.getSqrtRatioAtTick(tickUpper),
                    liquidity
                );

                IDefiEdgeTwapStrategy.NewTick memory newTick = IDefiEdgeTwapStrategy.NewTick({
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0: amount0,
                    amount1: amount1
                });

                defiEdgeTicks.push(newTick);

                console.log("tickLower: %s", uint24(-tickLower));
                console.log("tickUpper: %s", uint24(tickUpper));
                console.log("amount0: %s", amount0);
                console.log("amount1: %s", amount1);
            }

            // remove liquidity
            IDefiEdgeTwapStrategy.PartialTick[] memory existingTicks;
            IDefiEdgeTwapStrategy.NewTick[] memory newTicks;
            defiEdgeTwapStrategy.rebalance("", existingTicks, newTicks, true);
        }
    }

    function _custom(Item memory item) internal override {

        if (keccak256(bytes(item.dexName)) == keccak256(bytes('DefiEdge'))) {

            IDefiEdgeTwapStrategy defiEdgeTwapStrategy = IDefiEdgeTwapStrategy(item.pool);
            IUniswapV3Pool pool = IUniswapV3Pool(defiEdgeTwapStrategy.pool());

            // add liquidity
            IDefiEdgeTwapStrategy.PartialTick[] memory existingTicks;
            defiEdgeTwapStrategy.rebalance("", existingTicks, defiEdgeTicks, false);

            uint256 amount0 = IERC20(pool.token0()).balanceOf(address(defiEdgeTwapStrategy));
            uint256 amount1 = IERC20(pool.token1()).balanceOf(address(defiEdgeTwapStrategy));
            console.log("amount0 after: %s", amount0);
            console.log("amount1 after: %s", amount1);
        }
    }
}
