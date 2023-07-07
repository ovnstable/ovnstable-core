// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../GlobalPayoutListener.sol";
import "@overnight-contracts/connectors/contracts/stuff/DefiEdge.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";
import "hardhat/console.sol";

contract OptimismPayoutListener is GlobalPayoutListener {

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
            console.log("usd+ before: %s", IERC20(item.token).balanceOf(defiEdgeTwapStrategy.pool()));
            uint256 amount0 = IERC20(pool.token0()).balanceOf(address(defiEdgeTwapStrategy));
            uint256 amount1 = IERC20(pool.token1()).balanceOf(address(defiEdgeTwapStrategy));
            console.log("amount0 before: %s", amount0);
            console.log("amount1 before: %s", amount1);

            IDefiEdgeTwapStrategy.Tick[] memory ticks = defiEdgeTwapStrategy.getTicks();
            console.log("tickLower before: %s", uint256(-item.tickLower));
            console.log("tickUpper before: %s", uint256(item.tickUpper));

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
            console.log("usd+: %s", IERC20(item.token).balanceOf(defiEdgeTwapStrategy.pool()));

            // add liquidity
            console.log("tickLower after: %s", uint256(-item.tickLower));
            console.log("tickUpper after: %s", uint256(item.tickUpper));
            uint256 amount0 = IERC20(pool.token0()).balanceOf(address(defiEdgeTwapStrategy));
            uint256 amount1 = IERC20(pool.token1()).balanceOf(address(defiEdgeTwapStrategy));
            console.log("amount0: %s", amount0);
            console.log("amount1: %s", amount1);
            IDefiEdgeTwapStrategy.NewTick memory newTick = IDefiEdgeTwapStrategy.NewTick({
                tickLower: int24(item.tickLower),
                tickUpper: int24(item.tickUpper),
                amount0: amount0,
                amount1: amount1
            });
            IDefiEdgeTwapStrategy.PartialTick[] memory existingTicks;
            IDefiEdgeTwapStrategy.NewTick[] memory newTicks = new IDefiEdgeTwapStrategy.NewTick[](1);
            newTicks[0] = newTick;

            defiEdgeTwapStrategy.rebalance("", existingTicks, newTicks, false);

            console.log("usd+ after: %s", IERC20(item.token).balanceOf(defiEdgeTwapStrategy.pool()));

            amount0 = IERC20(pool.token0()).balanceOf(address(defiEdgeTwapStrategy));
            amount1 = IERC20(pool.token1()).balanceOf(address(defiEdgeTwapStrategy));
            console.log("amount0 after: %s", amount0);
            console.log("amount1 after: %s", amount1);
        }
    }
}
