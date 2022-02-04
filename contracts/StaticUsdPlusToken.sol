// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IStaticUsdPlusToken.sol";
import "./UsdPlusToken.sol";
import "./libraries/math/WadRayMath.sol";
import "hardhat/console.sol";

contract StaticUsdPlusToken is IStaticUsdPlusToken, ERC20 {
    using WadRayMath for uint256;

    UsdPlusToken _mainToken;

    constructor(address mainTokenAddress) ERC20("StaticUsdPlusToken", "stUSD+"){
        _mainToken = UsdPlusToken(mainTokenAddress);
    }

    /// @inheritdoc ERC20
    function decimals() public view override(ERC20, IERC20Metadata) returns (uint8) {
        return 6;
    }


    /// @inheritdoc IStaticUsdPlusToken
    function wrap(address recipient, uint256 amount) external override returns (uint256){
        return deposit(amount, recipient);
    }

    /// @inheritdoc IERC4626
    function deposit(uint256 assets, address receiver) public override returns (uint256){
        require(assets != 0, "Zero assets not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        _mainToken.transferFrom(msg.sender, address(this), assets);

        uint256 mintAmount = dynamicToStaticAmount(assets);
        _mint(receiver, mintAmount);

        emit Deposit(msg.sender, receiver, assets, mintAmount);

        return mintAmount;
    }

    /// @inheritdoc IStaticUsdPlusToken
    function unwrap(address recipient, uint256 amount) external override returns (uint256, uint256){
        uint256 redeemed = redeem(amount, recipient, msg.sender);
        return (amount, redeemed);
    }

    /// @inheritdoc IERC4626
    function redeem(uint256 shares, address receiver, address owner) public override returns (uint256){
        require(shares != 0, "Zero shares not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");
        require(owner != address(0), "Zero address for owner not allowed");

        if (owner != msg.sender) {
            uint256 currentAllowance = allowance(owner, msg.sender);
            require(currentAllowance >= shares, "Redeem amount exceeds allowance");
            _approve(owner, msg.sender, currentAllowance - shares);
        }

        _burn(owner, shares);

        uint256 transferAmount = staticToDynamicAmount(shares);
        _mainToken.transfer(receiver, transferAmount);

        emit Withdraw(owner, receiver, transferAmount, shares);

        return transferAmount;
    }

    /// @inheritdoc IStaticUsdPlusToken
    function dynamicBalanceOf(address account) external view override returns (uint256){
        return staticToDynamicAmount(balanceOf(account));
    }

    /// @inheritdoc IStaticUsdPlusToken
    function staticToDynamicAmount(uint256 amount) public view override returns (uint256){
        return amount.rayMul(_mainToken.liquidityIndex());
    }

    /// @inheritdoc IStaticUsdPlusToken
    function dynamicToStaticAmount(uint256 amount) public view override returns (uint256){
        return amount.rayDiv(_mainToken.liquidityIndex());
    }

    /// @inheritdoc IStaticUsdPlusToken
    function rate() external view override returns (uint256){
        return _mainToken.liquidityIndex();
    }

    /// @inheritdoc IERC4626
    function assetsPerShare() external view override returns (uint256){
        return _mainToken.liquidityIndex() / 10 ** 21;
    }

    /// @inheritdoc IStaticUsdPlusToken
    function mainToken() external view override returns (address){
        return address(_mainToken);
    }

    /// @inheritdoc IERC4626
    function asset() external view override returns (address){
        return address(_mainToken);
    }
}
