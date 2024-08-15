// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../PayoutManager.sol";

contract MockPayoutManager is PayoutManager {


    bool public payoutDoneCalled;
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutManager_init();
    }


    function payoutDone(address token, NonRebaseInfo [] memory nonRebaseInfo) external override {
        payoutDoneCalled = true;
    }
}
