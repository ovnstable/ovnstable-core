pragma solidity ^0.8.0;

interface IOvnOracle {

    function ovnToAsset(uint256 amount, address asset) external returns (uint256 rate);
    function assetToOvn(uint256 amount, address asset) external returns (uint256 rate);
    function ovnToAssetDuration(uint256 amount, address asset, uint256 duration) external returns (uint256 rate);
    function assetToOvnDuration(uint256 amount, address asset, uint256 duration) external returns (uint256 rate);

}
