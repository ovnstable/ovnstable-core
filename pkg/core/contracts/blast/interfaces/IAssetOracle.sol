pragma solidity ^0.8.0;

interface IAssetOracle {

    function convert(address assetIn, address assetOut, uint256 amountIn) external view returns (uint256 amountOut);
    function convertDuration(address assetIn, address assetOut, uint256 amountIn, uint256 duration) external view returns (uint256 amountOut);

}
