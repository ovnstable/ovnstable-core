// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;
import "./interfaces/IERC20MintableBurnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OvernightToken is IERC20MintableBurnable, ERC20 {


    uint256 private _totalMint;
    uint256 private _totalBurn;

    constructor() ERC20("TstOvernightToken", "OVN") {}

    function mint(address _sender, uint256 _amount) public override {
        _mint(_sender, _amount);
        _totalMint += _amount;
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }


    function burn(address _sender, uint256 _amount) public override {
        _burn(_sender, _amount);
        _totalBurn += _amount;
    }

    function totalMint() public view returns (uint256) {
        return _totalMint;
    }

    function totalBurn() public view returns (uint256) {
        return _totalBurn;
    }
}
