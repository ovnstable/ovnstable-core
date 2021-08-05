// SPDX-License-Identifier: MIT
pragma solidity >=0.5 <0.9.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract IERC20MintableBurnable is IERC20 {
    function mint(uint256 amount) external;

    function burn(uint256 amount) external;
}
