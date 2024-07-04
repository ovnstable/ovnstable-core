//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IMathFacet {
    function getCurrentPrice(address pair) external view returns (uint256);

    function getTickSpacing(address pair) external view returns (int24);

    function tickToPrice(address pair, int24 tick) external view returns (uint256);

    function priceToClosestTick(address pair, uint256[] memory prices) external view returns (int24[] memory);

    function getCurrentPoolTick(address pair) external view returns (int24 tick);

    function closestTicksForCurrentTick(address pair) external view returns (int24 left, int24 right);

    function getSqrtRatioByPrice(uint256 price, uint256 decimals) external pure returns (uint160);

    function getPriceBySqrtRatio(uint160 sqrtRatio, uint256 decimals) external pure returns (uint256);

    function priceToTicks(uint256[] memory priceRange, uint256 dec0, int24 tickSpacing) external pure returns (int24 lowerTick, int24 upperTick);

    function sqrt(uint y) external pure returns (uint z);
}
