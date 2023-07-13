// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../GlobalPayoutListener.sol";
import "@overnight-contracts/connectors/contracts/stuff/DefiEdge.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract OptimismPayoutListener is GlobalPayoutListener {

    IDefiEdgeTwapStrategy.NewTick[] private defiEdgeTicks;
    uint256 private tokenAmount;

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

            IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(item.pool);
            IUniswapV3Pool pool = IUniswapV3Pool(strategy.pool());

            // save current ticks
            delete defiEdgeTicks;
            IDefiEdgeTwapStrategy.Tick[] memory ticks = strategy.getTicks();
            for (uint8 i = 0; i < ticks.length; i++) {
                int24 tickLower = ticks[i].tickLower;
                int24 tickUpper = ticks[i].tickUpper;
                (uint128 liquidity, , , , ) = pool.positions(PositionKey.compute(address(strategy), tickLower, tickUpper));
                (uint160 sqrtRatioX96, , , , , , ) = pool.slot0();
                (uint256 amount0, uint256 amount1) = LiquidityAmounts.getAmountsForLiquidity(
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
            }

            // remove liquidity
            IDefiEdgeTwapStrategy.PartialTick[] memory existingTicks;
            IDefiEdgeTwapStrategy.NewTick[] memory newTicks;
            strategy.rebalance("", existingTicks, newTicks, true);

            tokenAmount = IERC20(item.token).balanceOf(item.pool);
        }
    }

    function _custom(Item memory item) internal override {

        if (keccak256(bytes(item.dexName)) == keccak256(bytes('DefiEdge'))) {

            IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(item.pool);

            // count delta
            uint256 delta;
            uint256 tokenAmountAfter = IERC20(item.token).balanceOf(item.pool);
            if (tokenAmountAfter > tokenAmount) {
                delta = tokenAmountAfter - tokenAmount;
            } else {
                delta = tokenAmount - tokenAmountAfter;
            }

            // add liquidity
            IDefiEdgeTwapStrategy.PartialTick[] memory existingTicks;
            strategy.rebalance("", existingTicks, defiEdgeTicks, false);

            emit PoolOperation(item.dexName, 'Custom', item.poolName, item.pool, item.token, delta, item.pool);
        }
    }
}
