// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./IWhitelist.sol";

contract Whitelist is IWhitelist, Initializable, OwnableUpgradeable, UUPSUpgradeable {

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
        __Ownable_init();
    }


    function setParams(SetUpParams memory params) external onlyOwner {
        serviceNft = IERC721Enumerable(params.serviceNft);
        partnerNft = IERC721Enumerable(params.partnerNft);
        guarded = params.guarded;
    }

    function _authorizeUpgrade(address newImplementation)
    internal
    onlyOwner
    override
    {}


    function verify(address user, uint256 tokenId, TypeNft typeNft) external override {
        require(msg.sender == guarded, 'only guarded');

        if (typeNft == TypeNft.SERVICE) {
            require(verifyServiceNft(user, tokenId), '!whitelist');
            usedServiceNftIds[tokenId] = true;
        } else {
            require(verifyPartnerNft(user, tokenId), '!whitelist');
            usedPartnerNftIds[tokenId] = true;
        }

    }

    function isWhitelist(address user,
        uint256[] calldata serviceIds,
        uint256[] calldata partnersIds) external override view returns (bool[] memory, bool[] memory){

        bool[] memory serviceFlags = new bool[](serviceIds.length);
        for (uint256 i = 0; i < serviceIds.length; ++i) {
            serviceFlags[i] = verifyServiceNft(user, serviceIds[i]);
        }

        bool[] memory partnerFlags = new bool[](partnersIds.length);
        for (uint256 i = 0; i < partnersIds.length; ++i) {
            partnerFlags[i] = verifyPartnerNft(user, partnersIds[i]);
        }

        return (serviceFlags, partnerFlags);
    }

    function verifyServiceNft(address user, uint256 tokenId) public view returns (bool){
        return serviceNft.ownerOf(tokenId) == user && !usedServiceNftIds[tokenId];
    }

    function verifyPartnerNft(address user, uint256 tokenId) public view returns (bool){
        return partnerNft.ownerOf(tokenId) == user && !usedPartnerNftIds[tokenId];
    }
}
