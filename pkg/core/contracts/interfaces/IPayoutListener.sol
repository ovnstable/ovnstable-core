// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IPayoutListener {

    function payoutDone(uint256 oldLiquidityIndex, uint256 newLiquidityIndex) external;

}
