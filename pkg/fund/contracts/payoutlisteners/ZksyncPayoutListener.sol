// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { ISyncSwapVault } from "@overnight-contracts/connectors/contracts/stuff/Syncswap.sol";
import {
    IRebaseWrapper,
    VelocoreV2Library,
    ILinearBribeFactory,
    OperationType,
    AmountType
} from "@overnight-contracts/connectors/contracts/stuff/VelocoreV2.sol";
import "../GlobalPayoutListener.sol";

import "@overnight-contracts/connectors/contracts/stuff/DefiEdge.sol";
import "@overnight-contracts/connectors/contracts/stuff/UniswapV3.sol";

contract ZksyncPayoutListener is GlobalPayoutListener {

    IDefiEdgeTwapStrategy.NewTick[] private defiEdgeTicks;

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    function zksync() external {
    }

    function _custom(Item memory item) internal override {
        bytes32 dexName = keccak256(bytes(item.dexName));
        if (dexName == keccak256(bytes('SyncSwap'))) {
            _customSyncSwap(item);
        } else if (dexName == keccak256(bytes('VelocoreV2'))) {
            _customVelocoreV2(item);
        } else if(dexName == keccak256(bytes('DefiEdge'))){
            _customDefiEdge(item);
        }
    }

    function _customUndone(Item memory item) internal override {
        bytes32 dexName = keccak256(bytes(item.dexName));
         if(dexName == keccak256(bytes('DefiEdge'))){
            _customUndoneDefiEdge(item);
        }
    }

    function positionKey(int24 tickLower, int24 tickUpper) external view returns (bytes32){

        IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(0x0772a1119Bbd71532BAf45a611825d27B0869fd3);

        return PositionKey.compute(address(strategy), tickLower, tickUpper);
    }

    function liquidityData(int24 tickLower, int24 tickUpper) external view returns (uint128){

        IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(0x0772a1119Bbd71532BAf45a611825d27B0869fd3);
        IUniswapV3Pool pool = IUniswapV3Pool(strategy.pool());

        (uint128 liquidity,,,,) = pool.positions(PositionKey.compute(address(strategy), tickLower, tickUpper));
        return liquidity;
    }

    function amounts(int24 tickLower, int24 tickUpper) external view returns(uint256, uint256){

        IDefiEdgeTwapStrategy strategy = IDefiEdgeTwapStrategy(0x0772a1119Bbd71532BAf45a611825d27B0869fd3);
        IUniswapV3Pool pool = IUniswapV3Pool(strategy.pool());

        (uint128 liquidity,,,,) = pool.positions(PositionKey.compute(address(strategy), tickLower, tickUpper));
        (uint160 sqrtRatioX96,,,,,,) = pool.slot0();
        (uint256 amount0, uint256 amount1) = LiquidityAmounts.getAmountsForLiquidity(
            sqrtRatioX96,
            TickMath.getSqrtRatioAtTick(tickLower),
            TickMath.getSqrtRatioAtTick(tickUpper),
            liquidity
        );

        return (amount0, amount1);
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

    function _customSyncSwap(Item memory item) internal {
        uint256 amount = ISyncSwapVault(0x621425a1Ef6abE91058E9712575dcc4258F8d091).deposit(item.token, item.to);
        emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, amount, item.to);
    }

    function _customVelocoreV2(Item memory item) internal {
        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IRebaseWrapper(item.pool).skim();
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;

        if (amountToken > 0) {

            if (item.feePercent > 0) {
                uint256 feeAmount = amountToken * item.feePercent / 100;
                amountToken -= feeAmount;
                if (feeAmount > 0) {
                    token.transfer(item.feeReceiver, feeAmount);
                    emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, feeAmount, item.feeReceiver);
                }
            }

            if (amountToken > 0) {
                address vault = address(0xf5E67261CB357eDb6C7719fEFAFaaB280cB5E2A6);
                address bribe = ILinearBribeFactory(address(0xc137d074DB1F839700eA8bb16d1eF2903e2DE7B2)).bribes(VelocoreV2Library.toToken(item.pool));
                address gauge = item.bribe;
                uint32 begin = _getVelocoreBribeBeginTimestamp(); // require ((begin % 3600) == 0)
                uint32 end = begin + 604800; // begin + 1 week. require ((end % 3600) == 0)

                token.approve(item.pool, amountToken);
                IRebaseWrapper(item.pool).depositExactIn(amountToken);
                uint256 rebaseBalance = IRebaseWrapper(item.pool).balanceOf(address(this)); // bribe all wrapped tokens

                // bribeAmount <= rebaseBalance because of rounding bribeSum % duration_in_seconds
                uint256 bribeAmount = VelocoreV2Library.run1(
                    vault,
                    0,
                    bribe,
                    OperationType.SWAP,
                    item.pool,
                    AmountType.EXACTLY,
                    rebaseBalance,
                    abi.encode(gauge, begin, 0, end, 0)
                );

                emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, bribeAmount, gauge);
            }
        }
    }

    function _getVelocoreBribeBeginTimestamp() internal returns (uint32) {
        uint256 beginHours = block.timestamp / 3600 + 1; // get total hours rounding down and add 1 hour
        return uint32(beginHours * 3600); // return begin timestamp
    }
}
