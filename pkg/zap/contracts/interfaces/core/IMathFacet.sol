//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IMathFacet {
    function getCurrentPrice(address pair) external view returns (uint256);

    function getTickSpacing(address pair) external view returns (int24);

    function tickToPrice(address pair, int24 tick) external view returns (uint256);

    function priceToClosestTick(address pair, uint256[] memory prices) external view returns (int24[] memory);

    function getCurrentPoolTick(address pair) external view returns (int24 tick);

    function closestTicksForCurrentTick(address pair) external view returns (int24 left, int24 right);
}
