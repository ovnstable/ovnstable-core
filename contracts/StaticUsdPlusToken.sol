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
    ERC20 _depositAsset;

    /**
     * @param usdPlusTokenAddress The address of UsdPlusToken
     * @param depositAsset The address of paired token to deposit/redeem, like USDC
     */
    constructor(
        address usdPlusTokenAddress,
        address depositAsset
    ) ERC20("StaticUsdPlusToken", "stUSD+"){
        _mainToken = UsdPlusToken(usdPlusTokenAddress);
        _depositAsset = ERC20(depositAsset);
    }

    /// @inheritdoc ERC20
    function decimals() public view override(ERC20, IERC20Metadata) returns (uint8) {
        return 6;
    }


    /// @inheritdoc IStaticUsdPlusToken
    function wrap(address recipient, uint256 amount) external override returns (uint256){
        require(recipient != address(0), "Zero address for recipient not allowed");
        require(amount != 0, "Zero amount not allowed");

        _mainToken.transferFrom(msg.sender, address(this), amount);

        uint256 mintAmount = dynamicToStaticAmount(amount);
        _mint(recipient, mintAmount);

        return mintAmount;
    }

    /// @inheritdoc IERC4626
    function deposit(uint256 assets, address receiver) external override returns (uint256){
        require(assets != 0, "Zero assets not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        _depositAsset.transferFrom(msg.sender, address(this), assets);
        _depositAsset.approve(_mainToken.exchange(), assets);

        uint256 mintAmount = IExchange(_mainToken.exchange()).buy(address(_depositAsset), assets);

        uint256 shareMintAmount = dynamicToStaticAmount(mintAmount);
        _mint(receiver, shareMintAmount);

        emit Deposit(msg.sender, receiver, assets, shareMintAmount);

        return shareMintAmount;
    }

    /// @inheritdoc IStaticUsdPlusToken
    function unwrap(address recipient, uint256 amount) external override returns (uint256, uint256){
        require(recipient != address(0), "Zero address for recipient not allowed");
        require(amount != 0, "Zero amount not allowed");

        _burn(msg.sender, amount);

        uint256 transferAmount = staticToDynamicAmount(amount);
        _mainToken.transfer(recipient, transferAmount);

        return (amount, transferAmount);
    }

    /// @inheritdoc IERC4626
    function redeem(uint256 shares, address receiver, address owner) external override returns (uint256){
        require(shares != 0, "Zero shares not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");
        require(owner != address(0), "Zero address for owner not allowed");

        if (owner != msg.sender) {
            uint256 currentAllowance = allowance(owner, msg.sender);
            require(currentAllowance >= shares, "Redeem amount exceeds allowance");
            _approve(owner, msg.sender, currentAllowance - shares);
        }

        _burn(owner, shares);

        uint256 redeemAmount = staticToDynamicAmount(shares);
        uint256 transferAmount = IExchange(_mainToken.exchange()).redeem(address(_depositAsset), redeemAmount);

        _depositAsset.transfer(receiver, transferAmount);

        emit Withdraw(msg.sender, receiver, owner, transferAmount, shares);

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

    /// @inheritdoc IStaticUsdPlusToken
    function mainToken() external view override returns (address){
        return address(_mainToken);
    }

    /// @inheritdoc IERC4626
    function asset() external view override returns (address){
        return address(_depositAsset);
    }

    /// @inheritdoc IERC4626
    function totalAssets() external view override returns (uint256){
        return _mainToken.balanceOf(address(this));
    }

    /// @inheritdoc IERC4626
    function assetsOf(address depositor) external view override returns (uint256){
        // 6 + 27 - 27 = 6
        return balanceOf(depositor) * _mainToken.liquidityIndex() / 10 ** 27;
    }

}
