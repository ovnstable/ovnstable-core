// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

interface IMark2Market {

    struct StrategyAsset {
        address strategy;
        uint256 netAssetValue; // 6 USDC
        uint256 liquidationValue; // 6 USDC
    }

    function strategyAssets() external view returns (StrategyAsset[] memory);

    // Return value 10*6
    function totalNetAssets() external view returns (uint256);

    // Return value 10*6
    function totalLiquidationAssets() external view returns (uint256);

}
