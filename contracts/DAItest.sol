// SPDX-License-Identifier: MIT
pragma solidity >=0.8 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAItest is  ERC20{

    constructor() ERC20("DAItest", "DAI")  {
        _mint(msg.sender, 10**24);

    }

}
