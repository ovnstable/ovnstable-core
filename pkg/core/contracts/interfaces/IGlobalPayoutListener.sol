// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IGlobalPayoutListener {

    function payoutDone(address _skimToken) external;

}
