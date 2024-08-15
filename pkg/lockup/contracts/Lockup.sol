// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/finance/VestingWallet.sol";

contract Lockup is VestingWallet {

    struct SetUpParams {
        address beneficiaryAddress;
        uint64 startTimestamp;
        uint64 durationSeconds;
    }

    constructor(SetUpParams memory params) VestingWallet(params.beneficiaryAddress, params.startTimestamp, params.durationSeconds) {
    }

}
