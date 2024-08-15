// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IBlockGetter.sol";

contract ArbitrumBlockGetter is IBlockGetter {

    // https://developer.arbitrum.io/time#case-study-multicall
    Multicall2 public multiCall = Multicall2(0x842eC2c7D803033Edf55E478F461FC547Bc54EB2);

    function getNumber() external override view returns (uint256){
        return multiCall.getBlockNumber();
    }


}

interface Multicall2 {

    function getBlockNumber() external view returns (uint256 blockNumber);
}
