// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../IWhitelist.sol";

contract MockWhitelist is IWhitelist {

    function isWhitelist(
        address user,
        uint256[] calldata serviceIds,
        uint256[] calldata partnersIds) external override view returns (bool[] memory serviceFlags, bool[] memory partnerFlags){

    }

    function verify(address user, uint256 tokenId, TypeNft typeNft) external override {

    }
}
