// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "../../Pools/Mute.sol";
import "../../Pools/Syncswap.sol";
import "../../interfaces/IPools.sol";

abstract contract UsdPlusPoolSwapper {
    uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;
    address internal constant PANCAKE_POOL = 0x6a8Fc7e8186ddC572e149dFAa49CfAE1E571108b;

    address internal constant WAL = 0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856;
    address internal constant USDC = 0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4;

    address internal constant MUTE_ROUTER = 0x8B791913eB07C32779a16750e3868aA8495F5964;
    address internal constant SYNCSWAP_POOL = 0xA06f1cce2Bb89f59D244178C2134e4Fc17B07306;
    address internal constant KYBER_POOL = 0x760B36C9024d27b95e45a1aA033aaDCB87DA77Dc;
    address internal constant EZKALIBUR_POOL = 0x0DfD96f6DbA1F3AC4ABb4D5CA36ce7Cb48767a13;
    address internal constant VESYNC_POOL = 0x16D0fC836FED0f645d832Eacc65106dDB67108Ef;

    function _swapBalanceSelf() internal view virtual returns (uint256);
    function _swapApprove(address spender, uint256 amount) internal virtual;
    function _swapTransfer(address to, uint256 amount) internal virtual;
    function _swapTokenAddress() internal view virtual returns (address);

    function _swapMute(uint256 amountIn) internal {
        require(_swapBalanceSelf() >= amountIn, "not enough USD+ on token contract");

        _swapApprove(MUTE_ROUTER, amountIn);

        address[] memory path = new address[](2);
        path[0] = _swapTokenAddress();
        path[1] = USDC;

        bool[] memory stable = new bool[](1);
        stable[0] = true;

        IMuteSwitchRouterDynamic(MUTE_ROUTER).swapExactTokensForTokens(
            amountIn,
            0,
            path,
            WAL,
            block.timestamp,
            stable
        );
    }

    function _swapSync(uint256 amountIn) internal {
        require(_swapBalanceSelf() >= amountIn, "not enough USD+ on token contract");

        address syncSwapVault = IPool(SYNCSWAP_POOL).vault();
        _swapApprove(SYNCSWAP_POOL, amountIn);
        _swapApprove(syncSwapVault, amountIn);

        IPool(SYNCSWAP_POOL).swap(
            abi.encode(_swapTokenAddress(), WAL, uint8(2)),
            _swapTokenAddress(),
            address(0),
            hex""
        );
    }

    function _swapKyber(uint256 amountIn) internal {
        require(_swapBalanceSelf() >= amountIn, "not enough USD+ on token contract");

        IKyberClassicPoolLike pool = IKyberClassicPoolLike(KYBER_POOL);
        address token0 = pool.token0();
        address token1 = pool.token1();
        require(token0 == USDC, "Kyber order mismatch: token0 must be USDC");
        require(token1 == _swapTokenAddress(), "Kyber order mismatch: token1 must be USD+");

        (uint112 reserve0, uint112 reserve1, uint112 vReserve0, uint112 vReserve1, uint256 feeInPrecision) = pool.getTradeInfo();

        (uint256 poolReserve0, uint256 poolReserve1) = pool.getReserves();
        require(poolReserve0 == uint256(reserve0), "Kyber reserve0 mismatch");
        require(poolReserve1 == uint256(reserve1), "Kyber reserve1 mismatch");

        uint256 amountOut = _calcAmountOutKyberClassic(
            amountIn,
            uint256(vReserve1), // tokenIn = token1 (USD+)
            uint256(vReserve0), // tokenOut = token0 (USDC)
            feeInPrecision
        );
        require(amountOut > 0, "Kyber amountOut = 0");
        require(amountOut < uint256(reserve0), "Kyber reserve0 insufficient");

        _swapTransfer(KYBER_POOL, amountIn);
        pool.swap(amountOut, 0, WAL, hex"");
    }

    function _swapPancake(uint256 amountIn) internal {
        require(_swapBalanceSelf() >= amountIn, "not enough USD+ on token contract");

        IPancakeV3PoolLike v3Pool = IPancakeV3PoolLike(PANCAKE_POOL);
        address token0 = v3Pool.token0();
        address token1 = v3Pool.token1();
        uint24 fee = v3Pool.fee();
        uint128 liq = v3Pool.liquidity();

        (bool slot0Ok, bytes memory slot0Data) = PANCAKE_POOL.staticcall(abi.encodeWithSignature("slot0()"));
        require(slot0Ok, "Pancake slot0 staticcall failed");
        require(slot0Data.length == 32 * 7, "Pancake slot0 bad return length");
        (
            uint160 sqrtPriceX96,
            ,
            ,
            ,
            ,
            ,
            bool unlocked
        ) = abi.decode(slot0Data, (uint160, int24, uint16, uint16, uint16, uint32, bool));
        address factory = v3Pool.factory();

        require(token1 == _swapTokenAddress(), "Pancake order mismatch: token1 must be USD+");
        require(token0 == USDC, "Pancake order mismatch: token0 must be USDC");
        require(liq > 0, "Pancake pool has no liquidity");
        require(sqrtPriceX96 > 0, "Pancake slot0 sqrtPriceX96=0");
        require(unlocked, "Pancake pool locked");

        address canonicalPool = IPancakeV3FactoryLike(factory).getPool(token0, token1, fee);
        require(canonicalPool == PANCAKE_POOL, "Pancake factory pool mismatch");

        (int256 amount0Delta, int256 amount1Delta) = v3Pool.swap(
            WAL,
            false,
            int256(amountIn),
            MAX_SQRT_RATIO - 1,
            abi.encode(PANCAKE_POOL)
        );

        require(amount0Delta < 0, "Pancake output not received");
        require(amount1Delta > 0, "Pancake input not consumed");
    }

    function pancakeV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external {
        address pool = abi.decode(data, (address));
        require(pool == PANCAKE_POOL, "Pancake callback pool mismatch");
        require(msg.sender == pool, "Pancake callback sender mismatch");
        address token1 = IPancakeV3PoolLike(pool).token1();
        require(token1 == _swapTokenAddress(), "Pancake callback token1 mismatch");

        if (amount1Delta > 0) {
            _swapTransfer(msg.sender, uint256(amount1Delta));
            return;
        }

        if (amount0Delta > 0) {
            address token0 = IPancakeV3PoolLike(pool).token0();
            require(token0 == _swapTokenAddress(), "Pancake callback token mismatch");
            _swapTransfer(msg.sender, uint256(amount0Delta));
            return;
        }

        revert("Pancake callback no payment required");
    }

    function _swapEzkalibur(uint256 amountIn) internal {
        uint256 feeBps = 20;
        require(_swapBalanceSelf() >= amountIn, "not enough USD+ on token contract");

        address token0 = IV2PoolLike(EZKALIBUR_POOL).token0();
        address token1 = IV2PoolLike(EZKALIBUR_POOL).token1();
        require(token0 == USDC, "Ezkalibur order mismatch: token0 must be USDC");
        require(token1 == _swapTokenAddress(), "Ezkalibur order mismatch: token1 must be USD+");

        (uint112 reserve0, uint112 reserve1, ) = IV2PoolLike(EZKALIBUR_POOL).getReserves();
        uint256 amountOut = _calcAmountOutV2(amountIn, uint256(reserve1), uint256(reserve0), feeBps);
        require(amountOut > 0, "Ezkalibur amountOut = 0");

        _swapTransfer(EZKALIBUR_POOL, amountIn);
        IV2PoolLike(EZKALIBUR_POOL).swap(amountOut, 0, WAL, "");
    }

    function _swapVeSync(uint256 amountIn) internal {
        uint256 feeBps = 30;
        require(_swapBalanceSelf() >= amountIn, "not enough USD+ on token contract");

        address token0 = IV2PoolLike(VESYNC_POOL).token0();
        address token1 = IV2PoolLike(VESYNC_POOL).token1();
        require(token0 == USDC, "VeSync order mismatch: token0 must be USDC");
        require(token1 == _swapTokenAddress(), "VeSync order mismatch: token1 must be USD+");

        (uint112 reserve0, uint112 reserve1, ) = IV2PoolLike(VESYNC_POOL).getReserves();
        uint256 amountOut = _calcAmountOutV2(amountIn, uint256(reserve1), uint256(reserve0), feeBps);
        require(amountOut > 0, "VeSync amountOut = 0");

        _swapTransfer(VESYNC_POOL, amountIn);
        IV2PoolLike(VESYNC_POOL).swap(amountOut, 0, WAL, "");
    }

    function _calcAmountOutV2(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 feeBps
    ) internal pure returns (uint256) {
        require(feeBps < 10000, "invalid fee");
        uint256 amountInWithFee = amountIn * (10000 - feeBps);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;
        return numerator / denominator;
    }

    function _calcAmountOutKyberClassic(
        uint256 amountIn,
        uint256 vReserveIn,
        uint256 vReserveOut,
        uint256 feeInPrecision
    ) internal pure returns (uint256) {
        uint256 precision = 1e18;
        require(feeInPrecision < precision, "Kyber invalid fee");
        uint256 amountInWithFee = amountIn * (precision - feeInPrecision) / precision;
        if (amountInWithFee == 0) {
            return 0;
        }
        return (amountInWithFee * vReserveOut) / (vReserveIn + amountInWithFee);
    }
}
