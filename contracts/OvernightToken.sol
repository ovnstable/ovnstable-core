// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;
import "./interfaces/IERC20MintableBurnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OvernightToken is IERC20MintableBurnable, ERC20 {
    constructor() ERC20("TstOvernightToken", "TstOVNGT") {}

    function mint(address _sender, uint256 _amount) public override {
        _mint(_sender, _amount);
    }

    function burn(address _sender, uint256 _amount) public override {
        _burn(_sender, _amount);
    }
}
