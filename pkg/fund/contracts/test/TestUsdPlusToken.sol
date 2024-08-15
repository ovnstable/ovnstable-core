pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../UsdPlusToken.sol";

contract TestUsdPlusToken is UsdPlusToken {

    uint8 private decimalsTest;

    function mintTest(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burnTest(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function approveTest(address owner, address spender, uint256 amount) external {
        // _approve(owner, spender, amount);
    }

    function decimals() public override view returns (uint8){
        return decimalsTest;
    }

    function setDecimals(uint8 _decimals) external {
        decimalsTest = _decimals;
    }
}
