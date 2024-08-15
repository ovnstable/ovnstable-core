// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../GlobalPayoutListener.sol";

import "@overnight-contracts/connectors/contracts/stuff/DefiEdge.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract ArbitrumPayoutListener is GlobalPayoutListener {

    IDefiEdgeTwapStrategy.NewTick[] private defiEdgeTicks;
    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    function arbitrum() external {
    }

    function _customUndone(Item memory item) internal override {
        if (keccak256(bytes(item.dexName)) == keccak256(bytes('DefiEdge'))) {
            _customUndoneDefiEdge(item);
        }
    }

    function _custom(Item memory item) internal override {
        if (keccak256(bytes(item.dexName)) == keccak256(bytes('DefiEdge'))) {
            _customDefiEdge(item);
        }
    }

    function _customUndoneDefiEdge(Item memory item) internal {

        IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(item.pool);
        IUniswapV3Pool pool = IUniswapV3Pool(strategy.pool());

        // save current ticks
        delete defiEdgeTicks;
        IDefiEdgeTwapStrategy.Tick[] memory ticks = strategy.getTicks();
        for (uint8 i = 0; i < ticks.length; i++) {
            int24 tickLower = ticks[i].tickLower;
            int24 tickUpper = ticks[i].tickUpper;
            (uint128 liquidity,,,,) = pool.positions(PositionKey.compute(address(strategy), tickLower, tickUpper));
            (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
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
        strategy.rebalance(false, 0, false, "", existingTicks, newTicks, true);
    }

    function _customDefiEdge(Item memory item) internal {

        // skim
        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IPool(item.pool).skim(address(this));
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;
        if (amountToken > 0) {
            if (item.feePercent > 0) {
                uint256 feeAmount = amountToken * item.feePercent / 100;
                amountToken -= feeAmount;
                if (feeAmount > 0) {
                    token.transfer(item.feeReceiver, feeAmount);
                    emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, feeAmount, item.feeReceiver);
                }
            }
            if (amountToken > 0) {
                token.transfer(item.to, amountToken);
                emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, amountToken, item.to);
            }
        }

        // add liquidity
        IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(item.pool);
        IDefiEdgeTwapStrategy.PartialTick[] memory existingTicks;
        strategy.rebalance(false, 0, false, "", existingTicks, defiEdgeTicks, false);
    }
}
