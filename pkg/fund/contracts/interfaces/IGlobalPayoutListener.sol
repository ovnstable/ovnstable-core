// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IGlobalPayoutListener {

    function payoutUndone(address _token) external;

    function payoutDone(address _token) external;

}
