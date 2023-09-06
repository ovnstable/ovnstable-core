// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

contract Whitelist {

    IERC721Enumerable public serviceNft;
    IERC721Enumerable public partnerNft;

    mapping(uint256 => bool) public usedServiceNftIds;
    mapping(uint256 => bool) public usedPartnerNftIds;


    function isWhitelist(address user) external returns (bool){

        (bool check,) = _checkPartnerNft(user);

        if (check) {
            return true;
        } else {
            (check,) = _checkServiceNft(user);
            return check;
        }
    }

    function _checkServiceNft(address user) internal returns (bool, uint256){

        uint256 balance = serviceNft.balanceOf(user);
        if (balance > 0) {

            for (uint256 i = 0; i < balance; i++) {

                uint256 tokenId = serviceNft.tokenOfOwnerByIndex(user, 0);

                bool isUsed = usedServiceNftIds[tokenId];
                if (isUsed) {
                    continue;
                } else {
                    return (true, tokenId);
                }
            }

            return (false, 0);
        } else {
            return (false, 0);
        }
    }

    function _checkPartnerNft(address user) internal returns (bool, uint256){

        uint256 balance = partnerNft.balanceOf(user);
        if (balance > 0) {

            for (uint256 i = 0; i < balance; i++) {

                uint256 tokenId = partnerNft.tokenOfOwnerByIndex(user, 0);

                bool isUsed = usedPartnerNftIds[tokenId];
                if (isUsed) {
                    continue;
                } else {
                    return (true, tokenId);
                }
            }

            return (false, 0);
        } else {
            return (false, 0);
        }
    }
}
