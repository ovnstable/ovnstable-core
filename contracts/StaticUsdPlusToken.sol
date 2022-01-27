// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IStaticUsdPlusToken.sol";
import "./UsdPlusToken.sol";
import "./libraries/math/WadRayMath.sol";

contract StaticUsdPlusToken is IStaticUsdPlusToken, ERC20 {
    using WadRayMath for uint256;

    UsdPlusToken _mainToken;

    constructor(address mainTokenAddress) ERC20("StaticUsdPlusToken", "stUSD+"){
        _mainToken = UsdPlusToken(mainTokenAddress);
    }

    ///@inheritdoc ERC20
    function decimals() public view override(ERC20, IERC20Metadata) returns (uint8) {
        return 6;
    }


    ///@inheritdoc IStaticUsdPlusToken
    function wrap(address recipient, uint256 amount) external override returns (uint256){
        require(recipient != address(0), "Zero address for recipient not allowed");
        require(amount != 0, "Zero amount not allowed");

        _mainToken.transferFrom(msg.sender, address(this), amount);

        uint256 mintAmount = dynamicToStaticAmount(amount);
        _mint(recipient, mintAmount);

        return mintAmount;
    }

    ///@inheritdoc IStaticUsdPlusToken
    function unwrap(address recipient, uint256 amount) external override returns (uint256, uint256){
        require(recipient != address(0), "Zero address for recipient not allowed");
        require(amount != 0, "Zero amount not allowed");

        _burn(msg.sender, amount);

        uint transferAmount = staticToDynamicAmount(amount);
        _mainToken.transfer(recipient, transferAmount);

        return (amount, transferAmount);
    }

    ///@inheritdoc IStaticUsdPlusToken
    function dynamicBalanceOf(address account) external view override returns (uint256){
        return staticToDynamicAmount(balanceOf(account));
    }

    ///@inheritdoc IStaticUsdPlusToken
    function staticToDynamicAmount(uint256 amount) public view override returns (uint256){
        return amount.rayMul(_mainToken.liquidityIndex());
    }

    ///@inheritdoc IStaticUsdPlusToken
    function dynamicToStaticAmount(uint256 amount) public view override returns (uint256){
        return amount.rayDiv(_mainToken.liquidityIndex());
    }

    ///@inheritdoc IStaticUsdPlusToken
    function rate() external view override returns (uint256){
        return _mainToken.liquidityIndex();
    }

    ///@inheritdoc IStaticUsdPlusToken
    function mainToken() external view override returns (address){
        return address(_mainToken);
    }
}
