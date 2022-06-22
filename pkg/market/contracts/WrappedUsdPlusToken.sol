// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IWrappedUsdPlusToken.sol";
import "./interfaces/IUsdPlusToken.sol";
import "./libraries/WadRayMath.sol";


contract WrappedUsdPlusToken is IWrappedUsdPlusToken, ERC20 {
    using WadRayMath for uint256;

    IUsdPlusToken _mainToken;

    /**
     * @param usdPlusTokenAddress The address of UsdPlusToken, this is `asset` in 4626 terms
     */
    constructor(address usdPlusTokenAddress) ERC20("Wrapped USD+", "WUSD+") {
        _mainToken = IUsdPlusToken(usdPlusTokenAddress);
    }

    /// @inheritdoc ERC20
    function decimals() public view override(ERC20, IERC20Metadata) returns (uint8) {
        return 6;
    }

    /// @inheritdoc IERC4626
    function deposit(uint256 assets, address receiver) external override returns (uint256){
        require(assets != 0, "Zero assets not allowed");
        require(receiver != address(0), "Zero address for receiver not allowed");

        _mainToken.transferFrom(msg.sender, address(this), assets);

        uint256 shareMintAmount = dynamicToStaticAmount(assets);
        _mint(receiver, shareMintAmount);

        emit Deposit(msg.sender, receiver, assets, shareMintAmount);

        return shareMintAmount;
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

        uint256 transferAmount = staticToDynamicAmount(shares);
        _mainToken.transfer(receiver, transferAmount);

        emit Withdraw(msg.sender, receiver, owner, transferAmount, shares);

        return transferAmount;
    }

    /// @inheritdoc IWrappedUsdPlusToken
    function dynamicBalanceOf(address account) external view override returns (uint256){
        return staticToDynamicAmount(balanceOf(account));
    }

    /// @inheritdoc IWrappedUsdPlusToken
    function staticToDynamicAmount(uint256 amount) public view override returns (uint256){
        return amount.rayMul(_mainToken.liquidityIndex());
    }

    /// @inheritdoc IWrappedUsdPlusToken
    function dynamicToStaticAmount(uint256 amount) public view override returns (uint256){
        return amount.rayDiv(_mainToken.liquidityIndex());
    }

    /// @inheritdoc IWrappedUsdPlusToken
    function rate() external view override returns (uint256){
        return _mainToken.liquidityIndex();
    }

    /// @inheritdoc IWrappedUsdPlusToken
    function mainToken() external view override returns (address){
        return address(_mainToken);
    }

    /// @inheritdoc IERC4626
    function asset() external view override returns (address){
        return address(_mainToken);
    }

    /// @inheritdoc IERC4626
    function totalAssets() external view override returns (uint256){
        return staticToDynamicAmount(totalSupply());
    }

    /// @inheritdoc IERC4626
    function assetsOf(address depositor) external view override returns (uint256){
        // 6 + 27 - 27 = 6
        return balanceOf(depositor) * _mainToken.liquidityIndex() / 10 ** 27;
    }

}
