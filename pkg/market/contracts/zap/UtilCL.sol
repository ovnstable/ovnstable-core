// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library SafeCast {
    /// @notice Cast a uint256 to a uint160, revert on overflow
    /// @param y The uint256 to be downcasted
    /// @return z The downcasted integer, now type uint160
    function toUint160(uint256 y) internal pure returns (uint160 z);
}

library Util {
    function getSqrtRatioByPrice(uint256 price, uint256 decimals) internal pure returns (uint160) {
        return SafeCast.toUint160(sqrt(FullMath.mulDiv(price, 2 ** 192, decimals)));
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio, uint256 decimals) internal pure returns (uint256) {
        return FullMath.mulDiv(uint256(sqrtRatio), uint256(sqrtRatio) * decimals, 2 ** 192);
    }

    function priceToTicks(uint256[] memory priceRange, uint256 dec0, int24 tickSpacing) internal pure returns (int24 lowerTick, int24 upperTick) {

        lowerTick = TickMath.getTickAtSqrtRatio(Util.getSqrtRatioByPrice(priceRange[0], dec0));
        upperTick = TickMath.getTickAtSqrtRatio(Util.getSqrtRatioByPrice(priceRange[1], dec0));

        if (lowerTick % tickSpacing != 0) {
            lowerTick = lowerTick > 0 ? lowerTick - lowerTick % tickSpacing : lowerTick - tickSpacing - (lowerTick % tickSpacing);
        }
        if (upperTick % tickSpacing != 0) {
            upperTick = upperTick > 0 ? upperTick + tickSpacing - (upperTick % tickSpacing) : upperTick - (upperTick % tickSpacing);
        }
    }

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}