// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../interfaces/IPayoutListener.sol";


contract MockPayoutListener is IPayoutListener {

    // --- logic

    function payoutDone(uint256 oldLiquidityIndex, uint256 newLiquidityIndex) external override {
        // need just detect that method was called and could be
        // made by revert usage in tests
        revert("MockPayoutListener.payoutDone() called");
    }

}
