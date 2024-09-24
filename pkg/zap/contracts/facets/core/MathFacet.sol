//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";

contract MathFacet is IMathFacet, Modifiers {
    function getCurrentPrice(address pair) external view returns (uint256) {
        (uint256 dec0,) = masterFacet().getPoolDecimals(pair);
        uint160 sqrtRatioX96 = masterFacet().getPoolSqrtRatioX96(pair);
        return masterFacet().mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
    }

    function getTickSpacing(address pair) external view returns (int24) {
        return masterFacet().getPoolTickSpacing(pair);
    }

    function tickToPrice(address pair, int24 tick) external view returns (uint256) {
        (uint256 dec0,) = masterFacet().getPoolDecimals(pair);
        uint256 dec = 10 ** dec0;
        uint160 sqrtRatioX96 = masterFacet().getSqrtRatioAtTick(tick);
        return getPriceBySqrtRatio(sqrtRatioX96, dec);
    }

    function priceToClosestTick(address pair, uint256[] memory prices) external view returns (int24[] memory) {
        (uint256 dec0,) = masterFacet().getPoolDecimals(pair);
        uint256 dec = 10 ** dec0;
        int24 tickSpacing = masterFacet().getPoolTickSpacing(pair);

        int24[] memory closestTicks = new int24[](prices.length);
        for (uint256 i = 0; i < prices.length; i++) {
            uint160 sqrtRatioX96 = getSqrtRatioByPrice(prices[i], dec);
            int24 currentTick = masterFacet().getTickAtSqrtRatio(sqrtRatioX96);
            if (currentTick % tickSpacing >= 0) {
                closestTicks[i] = currentTick - currentTick % tickSpacing;
            } else {
                closestTicks[i] = currentTick - tickSpacing - (currentTick % tickSpacing);
            }
        }
        return closestTicks;
    }

    function getCurrentPoolTick(address pair) external view returns (int24) {
        return masterFacet().getPoolTick(pair);
    }

    function closestTicksForCurrentTick(address pair) external view returns (int24 left, int24 right) {
        int24 tick = masterFacet().getPoolTick(pair);
        int24 tickSpacing = masterFacet().getPoolTickSpacing(pair);
        if (tick % tickSpacing >= 0) {
            left = tick - tick % tickSpacing;
            right = tick + tickSpacing - (tick % tickSpacing);
        } else {
            left = tick - tickSpacing - (tick % tickSpacing);
            right = tick - (tick % tickSpacing);
        }
    }

    function getSqrtRatioByPrice(uint256 price, uint256 decimals) internal view returns (uint160) {
        return masterFacet().toUint160(sqrt(masterFacet().mulDiv(price, 2 ** 192, decimals)));
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio, uint256 decimals) internal view returns (uint256) {
        return masterFacet().mulDiv(uint256(sqrtRatio), uint256(sqrtRatio) * decimals, 2 ** 192);
    }

    function sqrt(uint y) internal pure returns (uint z) {
        z = 0;
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

    function compareRatios(uint256 a, uint256 b, uint256 c, uint256 d) external pure returns (bool) {
        return a * d > b * c;
    }

    function masterFacet() internal view returns (IMasterFacet) {
        return IMasterFacet(address(this));
    }
}
