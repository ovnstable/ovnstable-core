//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/core/IPoolFetcherFacet.sol";

contract PoolAggregator is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UNIT_ROLE = keccak256("UNIT_ROLE");

    address[] public zaps;

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admin");
        _;
    }

    modifier onlyUnit() {
        require(hasRole(UNIT_ROLE, msg.sender), "Restricted to unit");
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    function addProtocol(address addr) onlyUnit external {
        bool protocolExists = false;
        for (uint256 i = 0; i < zaps.length; i++) {
            if (zaps[i] == addr) {
                protocolExists = true;
                break;
            }
        }
        require(!protocolExists, "Protocol already exists");
        zaps.push(addr);
    }

    function removeProtocol(address addr) onlyUnit external {
        for (uint256 i = 0; i < zaps.length; i++) {
            if (zaps[i] == addr) {
                zaps[i] = zaps[zaps.length - 1];
                zaps.pop();
                return;
            }
        }
    }

    function aggregatePools(uint256 limit, uint256 offset)
        external view returns (IPoolFetcherFacet.PoolInfo[] memory result) {
        uint256 totalPoolsAmount;
        uint256 resultSize;
        uint256 resultPoolsCounter;

        for (uint256 c = 0; c < zaps.length; c++) {
            totalPoolsAmount += IPoolFetcherFacet(zaps[c]).getPoolsAmount();
        }
        if (offset < totalPoolsAmount) {
            resultSize = offset + limit > totalPoolsAmount ? totalPoolsAmount - offset : limit;
        }
        result = new IPoolFetcherFacet.PoolInfo[](resultSize);
        if (resultSize == 0) {
            return result;
        }

        for (uint256 q = 0; q < zaps.length; q++) {
            IPoolFetcherFacet fetcher = IPoolFetcherFacet(zaps[q]);
            uint256 poolsAmount = fetcher.getPoolsAmount();
            if (offset >= poolsAmount) {
                offset -= poolsAmount;
                continue;
            }
            IPoolFetcherFacet.PoolInfo[] memory currentPools = fetcher.fetchPools(limit, offset);
            for (uint256 j = 0; j < currentPools.length; j++) {
                result[resultPoolsCounter] = currentPools[j];
                resultPoolsCounter++;
            }
            if (currentPools.length >= limit) {
                break;
            }
            limit -= currentPools.length;
            offset = 0;
        }
    }
}
