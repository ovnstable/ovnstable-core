// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../GlobalPayoutListener.sol";

contract MockGlobalPayoutListener is GlobalPayoutListener {


    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }


}
