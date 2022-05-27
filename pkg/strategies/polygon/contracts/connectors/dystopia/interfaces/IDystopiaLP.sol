// SPDX-License-Identifier: MIT
pragma solidity >=0.5 <0.9.0;

import "../../uniswap/v2/interfaces/IUniswapV2Pair.sol";

abstract contract IDystopiaLP is IUniswapV2Pair {
    
    mapping(address => uint) public override balanceOf;

    function deposit(uint amount, uint tokenId) external virtual;
    
    function withdraw(uint amount) external virtual;
    
    function withdrawAll() external virtual;

    function getReward(address account, address[] memory tokens) external virtual;

}
