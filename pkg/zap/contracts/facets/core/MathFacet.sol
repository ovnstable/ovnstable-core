//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import  "../../interfaces/core/IMathFacet.sol";
import "../../interfaces/IMasterFacet.sol";

contract MathFacet is IMathFacet {

    function getCurrentPrice(address pair) public view returns (uint256) {
        (uint256 dec0,) = IChainFacet.getPoolDecimals(pair);
        (uint160 sqrtRatioX96,,,,,) = IChainFacet.getPoolSqrtRatioX96(pair);
        return IChainFacet.mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
    }

    function getTickSpacing(address pair) public view returns (int24) {
        return IChainFacet.getPoolTickSpacing(pair);
    }

    function tickToPrice(address pair, int24 tick) public view returns (uint256) {
        (uint256 dec0,) = IChainFacet.getPoolDecimals(pair);
        uint256 dec = 10 ** dec0;
        uint160 sqrtRatioX96 = IChainFacet.getSqrtRatioAtTick(tick);
        return getPriceBySqrtRatio(sqrtRatioX96, dec);
    }

    function priceToClosestTick(address pair, uint256[] memory prices) public view returns (int24[] memory) {
        (uint256 dec0,) = IChainFacet.getPoolDecimals(pair);
        uint256 dec = 10 ** dec0;
        int24 tickSpacing = IChainFacet.getPoolTickSpacing(pair);

        int24[] memory closestTicks = new int24[](prices.length);
        for (uint256 i = 0; i < prices.length; i++) {
            uint160 sqrtRatioX96 = getSqrtRatioByPrice(prices[i], dec);
            int24 currentTick = IChainFacet.getTickAtSqrtRatio(sqrtRatioX96);
            if (currentTick % tickSpacing >= 0) {
                closestTicks[i] = currentTick - currentTick % tickSpacing;
            } else {
                closestTicks[i] = currentTick - tickSpacing - (currentTick % tickSpacing);
            }
        }
        return closestTicks;
    }

    function getCurrentPoolTick(address pair) public view returns (int24) {
        return IChainFacet.getPoolTick(pair);
    }

    function closestTicksForCurrentTick(address pair) public view returns (int24 left, int24 right) {
        int24 tick = getCurrentPoolTick(pair);
        int24 tickSpacing = getTickSpacing(pair);
        if (tick % tickSpacing >= 0) {
            left = tick - tick % tickSpacing;
            right = tick + tickSpacing - (tick % tickSpacing);
        } else {
            left = tick - tickSpacing - (tick % tickSpacing);
            right = tick - (tick % tickSpacing);
        }
    }

    function getSqrtRatioByPrice(uint256 price, uint256 decimals) internal pure returns (uint160) {
        return IChainFacet.toUint160(sqrt(IChainFacet.mulDiv(price, 2 ** 192, decimals)));
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio, uint256 decimals) internal pure returns (uint256) {
        return IChainFacet.mulDiv(uint256(sqrtRatio), uint256(sqrtRatio) * decimals, 2 ** 192);
    }

    function priceToTicks(uint256[] memory priceRange, uint256 dec0, int24 tickSpacing) internal pure returns (int24 lowerTick, int24 upperTick) {
        lowerTick = IChainFacet.getTickAtSqrtRatio(getSqrtRatioByPrice(priceRange[0], dec0));
        upperTick = IChainFacet.getTickAtSqrtRatio(getSqrtRatioByPrice(priceRange[1], dec0));

        if (lowerTick % tickSpacing != 0) {
            lowerTick = lowerTick > 0 ? lowerTick - lowerTick % tickSpacing : lowerTick - tickSpacing - (lowerTick % tickSpacing);
        }
        if (upperTick % tickSpacing != 0) {
            upperTick = upperTick > 0 ? upperTick + tickSpacing - (upperTick % tickSpacing) : upperTick - (upperTick % tickSpacing);
        }
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
}
