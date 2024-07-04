//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../../interfaces/IMasterFacet.sol";

contract MathFacet is IMathFacet, Modifiers {
    function getCurrentPrice(address pair) external onlyDiamond view returns (uint256) {
        IMasterFacet master = IMasterFacet(address(this));
        (uint256 dec0,) = master.getPoolDecimals(pair);
        uint160 sqrtRatioX96 = master.getPoolSqrtRatioX96(pair);
        return master.mulDiv(uint256(sqrtRatioX96) * 10 ** dec0, uint256(sqrtRatioX96), 2 ** (96 + 96));
    }

    function getTickSpacing(address pair) external view returns (int24) {
        IMasterFacet master = IMasterFacet(address(this));
        return master.getPoolTickSpacing(pair);
    }

    function tickToPrice(address pair, int24 tick) external view returns (uint256) {
        IMasterFacet master = IMasterFacet(address(this));
        (uint256 dec0,) = master.getPoolDecimals(pair);
        uint256 dec = 10 ** dec0;
        uint160 sqrtRatioX96 = master.getSqrtRatioAtTick(tick);
        return getPriceBySqrtRatio(sqrtRatioX96, dec);
    }

    function priceToClosestTick(address pair, uint256[] memory prices) external view returns (int24[] memory) {
        IMasterFacet master = IMasterFacet(address(this));
        (uint256 dec0,) = master.getPoolDecimals(pair);
        uint256 dec = 10 ** dec0;
        int24 tickSpacing = master.getPoolTickSpacing(pair);

        int24[] memory closestTicks = new int24[](prices.length);
        for (uint256 i = 0; i < prices.length; i++) {
            uint160 sqrtRatioX96 = getSqrtRatioByPrice(prices[i], dec);
            int24 currentTick = master.getTickAtSqrtRatio(sqrtRatioX96);
            if (currentTick % tickSpacing >= 0) {
                closestTicks[i] = currentTick - currentTick % tickSpacing;
            } else {
                closestTicks[i] = currentTick - tickSpacing - (currentTick % tickSpacing);
            }
        }
        return closestTicks;
    }

    function getCurrentPoolTick(address pair) external view returns (int24) {
        IMasterFacet master = IMasterFacet(address(this));
        return master.getPoolTick(pair);
    }

    function closestTicksForCurrentTick(address pair) external view returns (int24 left, int24 right) {
        IMasterFacet master = IMasterFacet(address(this));
        int24 tick = master.getPoolTick(pair);
        int24 tickSpacing = master.getPoolTickSpacing(pair);
        if (tick % tickSpacing >= 0) {
            left = tick - tick % tickSpacing;
            right = tick + tickSpacing - (tick % tickSpacing);
        } else {
            left = tick - tickSpacing - (tick % tickSpacing);
            right = tick - (tick % tickSpacing);
        }
    }

    function getSqrtRatioByPrice(uint256 price, uint256 decimals) internal view returns (uint160) {
        IMasterFacet master = IMasterFacet(address(this));
        return master.toUint160(sqrt(master.mulDiv(price, 2 ** 192, decimals)));
    }

    function getPriceBySqrtRatio(uint160 sqrtRatio, uint256 decimals) internal view returns (uint256) {
        IMasterFacet master = IMasterFacet(address(this));
        return master.mulDiv(uint256(sqrtRatio), uint256(sqrtRatio) * decimals, 2 ** 192);
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
