//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IPositionManagerFacet {
    struct PositionInfo {
        string platform;
        uint256 tokenId;
        address poolId;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint256 rewardAmount0;
        uint256 rewardAmount1;
        int24 tickLower;
        int24 tickUpper;
        int24 currentTick;
        uint256 apr;
    }

    function mintPosition(
        address pair,
        int24 tickRange0,
        int24 tickRange1,
        uint256 amountOut0,
        uint256 amountOut1,
        address recipient
    ) external returns (uint256);

    function closePosition(uint256 tokenId, address recipient) external;

    function getPositions(address wallet) external view returns (PositionInfo[] memory);

    function getPositionVolume(uint256 tokenId) external view returns (uint256, uint256);

    function checkForOwner(uint256 tokenId, address sender) external view;
}
