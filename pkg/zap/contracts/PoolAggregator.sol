//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/core/IPoolFetcherFacet.sol";
import "hardhat/console.sol";

contract PoolAggregator is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    address[] public zaps;
    string[] public protocols;

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "!Admin");
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    function addProtocol(address addr, string memory name) onlyAdmin external {
        zaps.push(addr);
        protocols.push(name);
    }

    function removeProtocol(address addr) onlyAdmin external {
        for (uint256 i = 0; i < zaps.length; i++) {
            if (zaps[i] == addr) {
                zaps[i] = zaps[zaps.length - 1];
                protocols[i] = protocols[protocols.length - 1];
                zaps.pop();
                protocols.pop();
            }
        }
    }

    function aggregatePools(address[] memory protocolFilter, uint256 limit, uint256 offset)
        external view returns (IPoolFetcherFacet.PoolInfo[] memory result) {
        uint256 totalPoolsAmount;
        for (uint256 c = 0; c < zaps.length; c++) {
            if (!checkProtocolFilter(protocolFilter, zaps[c])) continue;
            totalPoolsAmount += IPoolFetcherFacet(zaps[c]).getPoolsAmount();
        }
        uint256 size;
        if (offset < totalPoolsAmount) {
            size = offset + limit > totalPoolsAmount ? totalPoolsAmount - offset : limit;
        }
        result = new IPoolFetcherFacet.PoolInfo[](size);
        if (size == 0) {
            return result;
        }
        uint256 i;

        for (uint256 q = 0; q < zaps.length; q++) {
            if (!checkProtocolFilter(protocolFilter, zaps[q])) continue;
            IPoolFetcherFacet fetcher = IPoolFetcherFacet(zaps[q]);
            uint256 poolsAmount = fetcher.getPoolsAmount();
            if (offset >= poolsAmount) {
                offset -= poolsAmount;
                continue;
            }
            IPoolFetcherFacet.PoolInfo[] memory currentPools = fetcher.getPools(limit, offset);
            for (uint256 j = 0; j < zaps.length; j++) {
                result[i] = currentPools[j];
                i++;
            }
            if (currentPools.length >= limit) {
                break;
            }
            limit -= currentPools.length;
            offset = 0;
        }
    }

    function checkProtocolFilter(address[] memory protocolFilter, address protocol) internal pure returns (bool) {
        for (uint256 i = 0; i < protocolFilter.length; i++) {
            if (protocolFilter[i] == protocol) {
                return true;
            }
        }
        return protocolFilter.length == 0;
    }
}
