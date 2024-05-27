// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
import "../PayoutManager.sol";

contract DefaultPayoutManager is PayoutManager {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutManager_init();
    }


}
