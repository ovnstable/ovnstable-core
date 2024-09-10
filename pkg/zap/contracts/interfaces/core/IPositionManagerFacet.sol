//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IPositionManagerFacet {
    event CollectRewards(uint256 amount0, uint256 amount1);

    struct PositionInfo {
        string platform;
        uint256 tokenId;
        address poolId;
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint256 fee0;
        uint256 fee1;
        uint256 emissions;
        int24 tickLower;
        int24 tickUpper;
        int24 currentTick;
        bool isStaked;
    }

    function mintPosition(
        address pair,
        int24 tickRange0,
        int24 tickRange1,
        uint256 amountOut0,
        uint256 amountOut1,
        address recipient
    ) external returns (uint256);

    function increaseLiquidity(
        uint256 tokenId,
        uint256 amount0,
        uint256 amount1
    ) external returns (uint128);

    function swap(
        address pair,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96,
        bool zeroForOne
    ) external returns (int256, int256);

    function closePosition(uint256 tokenId, address recipient, address feeRecipient) external;

    function getPositions(address wallet) external view returns (PositionInfo[] memory);

    function getPositionAmounts(uint256 tokenId) external view returns (uint256, uint256);

    function checkForOwner(uint256 tokenId, address sender) external view;

    function getTokens(uint256 tokenId) external view returns (address, address);

    function getTicks(uint256 tokenId) external view returns (int24, int24);

    function getPool(uint256 tokenId) external view returns (address);
}
