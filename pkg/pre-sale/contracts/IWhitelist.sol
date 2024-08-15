// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IWhitelist {

    enum TypeNft{
        SERVICE,
        PARTNER
    }

    function isWhitelist(
        address user,
        uint256[] calldata serviceIds,
        uint256[] calldata partnersIds) external view returns (bool[] memory serviceFlags, bool[] memory partnerFlags);

    function verify(address user, uint256 tokenId, TypeNft typeNft) external;
}
