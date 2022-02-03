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

    event Deposit(address indexed from, address indexed to, uint256 value);

    event Withdraw(address indexed from, address indexed to, uint256 value);

    ///@inheritdoc ERC20
    function decimals() public view override(ERC20, IERC20Metadata) returns (uint8) {
        return 6;
    }

    /**
      @notice Deposit a specific amount of underlying tokens.
      @param amount The amount of the underlying token to deposit.
      @param to The address to receive shares corresponding to the deposit
      @return shares The shares in the vault credited to `to`
     */
    function deposit(uint256 amount, address to) public returns (uint256) {
      emit Deposit(msg.sender, to, amount);

      return wrap(to, amount);
    }

    ///@inheritdoc IStaticUsdPlusToken
    function wrap(address recipient, uint256 amount) public override returns (uint256){
        require(recipient != address(0), "Zero address for recipient not allowed");
        require(amount != 0, "Zero amount not allowed");

        _mainToken.transferFrom(msg.sender, address(this), amount);

        uint256 mintAmount = dynamicToStaticAmount(amount);
        _mint(recipient, mintAmount);

        return mintAmount;
    }

    /**
      @notice Withdraw a specific amount of underlying tokens.
      @param amount The amount of the underlying token to withdraw.
      @param to The address to receive underlying corresponding to the withdrawal.
      @param from The address to burn shares from corresponding to the withdrawal.
      @return shares The shares in the vault burned from sender
     */
    function withdraw(uint256 amount, address to, address from) public returns (uint256) {
      require(msg.sender == from);
      emit Withdraw(msg.sender, to, amount);

      return unwrap(receiver, assets);
    }

    ///@inheritdoc IStaticUsdPlusToken
    function unwrap(address recipient, uint256 amount) public override returns (uint256, uint256){
        require(recipient != address(0), "Zero address for recipient not allowed");
        require(amount != 0, "Zero amount not allowed");

        _burn(msg.sender, amount);

        uint256 transferAmount = staticToDynamicAmount(amount);
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
    function assetsPerShare() external view override returns (uint256){
        return _mainToken.liquidityIndex() / 10 ** 21;
    }

    ///@inheritdoc IStaticUsdPlusToken
    function mainToken() external view override returns (address){
        return address(_mainToken);
    }

    ///@inheritdoc IStaticUsdPlusToken
    function underlying() external view override returns (address){
        return address(_mainToken);
    }
}
