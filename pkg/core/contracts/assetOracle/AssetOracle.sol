// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "@overnight-contracts/common/contracts/libraries/WadRayMath.sol";
import "../interfaces/IAssetOracle.sol";
import "../interfaces/IRebaseToken.sol";

import "hardhat/console.sol";

abstract contract AssetOracle is IAssetOracle {

    address owner;
    uint256 public twapDurationSec;
    mapping(address => mapping(address => bool)) public assets;

    constructor() {
        twapDurationSec = 10800; // 3 hour
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "Restricted to owner");
        _;
    }

    function setOwner(address _owner) external onlyOwner {
        owner = _owner;
    }

    function setTwapDurationSec(uint256 _twapDurationSec) external onlyOwner {
        twapDurationSec = _twapDurationSec;
    }

    function isAvaliableConvert(address address0, address address1) public view returns (bool) {
        return assets[address0][address1];
    }

    function convert(address assetIn, address assetOut, uint256 amountIn) public view returns (uint256 amountOut) {
        return _convertDuration(assetIn, assetOut, amountIn, twapDurationSec);
    }

    function convertDuration(address assetIn, address assetOut, uint256 amountIn, uint256 duration) public view returns (uint256 amountOut) {
        return _convertDuration(assetIn, assetOut, amountIn, duration);
    }

    function _convertDuration(address assetIn, address assetOut, uint256 amountIn, uint256 duration) virtual internal view returns (uint256 amountOut);

}
