// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "./IWhitelist.sol";

contract Whitelist is IWhitelist, Initializable, AccessControlUpgradeable, UUPSUpgradeable {

    IERC721Enumerable public serviceNft;
    IERC721Enumerable public partnerNft;

    mapping(uint256 => bool) public usedServiceNftIds; // Galxe NFT
    mapping(uint256 => bool) public usedPartnerNftIds; // Own OVN NFT

    address public guarded;

    struct SetUpParams {
        address serviceNft;
        address partnerNft;
        address guarded;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __UUPSUpgradeable_init();
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    function setParams(SetUpParams memory params) external onlyRole(DEFAULT_ADMIN_ROLE) {
        serviceNft = IERC721Enumerable(params.serviceNft);
        partnerNft = IERC721Enumerable(params.partnerNft);
        guarded = params.guarded;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyRole(DEFAULT_ADMIN_ROLE)
    override
    {}


    function verify(address user) external override {
        require(msg.sender == guarded, 'only guarded');

        (bool check, uint256 tokenId) = _checkPartnerNft(user);

        if (check) {
            usedPartnerNftIds[tokenId] = true;
        } else {
            (check, tokenId) = _checkServiceNft(user);

            if (check) {
                usedServiceNftIds[tokenId] = true;
            } else {
                revert('!whitelist');
            }
        }
    }

    function isWhitelist(address user) external override view returns (bool){

        (bool check,) = _checkPartnerNft(user);

        if (check) {
            return true;
        } else {
            (check,) = _checkServiceNft(user);
            return check;
        }
    }

    function _checkServiceNft(address user) internal view returns (bool, uint256){

        uint256 balance = serviceNft.balanceOf(user);
        if (balance > 0) {

            for (uint256 i = 0; i < balance; i++) {

                uint256 tokenId = serviceNft.tokenOfOwnerByIndex(user, i);

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

    function _checkPartnerNft(address user) internal view returns (bool, uint256){

        uint256 balance = partnerNft.balanceOf(user);
        if (balance > 0) {

            for (uint256 i = 0; i < balance; i++) {

                uint256 tokenId = partnerNft.tokenOfOwnerByIndex(user, i);

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
