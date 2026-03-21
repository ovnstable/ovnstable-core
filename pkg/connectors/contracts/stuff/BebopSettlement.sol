// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IBebopSettlement {
    function registerAllowedOrderSigner(address signer, bool allowed) external;
}
