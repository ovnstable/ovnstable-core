// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract OvernightToken is ERC20 {

    constructor() ERC20("TstOvernightToken", "TstOVNGT") {}

    function mint(address _sender, uint256 _amount) public {
        _mint(_sender, _amount);
    }

    function burn(address _sender, uint256 _amount) public {
        _burn(_sender, _amount);
    }
}
