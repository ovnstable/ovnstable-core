// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../PayoutListener.sol";


contract AvalanchePayoutListener is PayoutListener {

    address[] public qsSyncPools;

    // ---  events

    event QsSyncPoolsUpdated(uint256 index, address pool);
    event QsSyncPoolsRemoved(uint256 index, address pool);

    // --- setters

    function setQsSyncPools(address[] calldata _qsSyncPools) external onlyAdmin {

        uint256 minLength = (qsSyncPools.length < _qsSyncPools.length) ? qsSyncPools.length : _qsSyncPools.length;

        // replace already exists
        for (uint256 i = 0; i < minLength; i++) {
            qsSyncPools[i] = _qsSyncPools[i];
            emit QsSyncPoolsUpdated(i, _qsSyncPools[i]);
        }

        // add if need
        if (minLength < _qsSyncPools.length) {
            for (uint256 i = minLength; i < _qsSyncPools.length; i++) {
                qsSyncPools.push(_qsSyncPools[i]);
                emit QsSyncPoolsUpdated(i, _qsSyncPools[i]);
            }
        }

        // truncate if need
        if (qsSyncPools.length > _qsSyncPools.length) {
            uint256 removeCount = qsSyncPools.length - _qsSyncPools.length;
            for (uint256 i = 0; i < removeCount; i++) {
                address qsPool = qsSyncPools[qsSyncPools.length - 1];
                qsSyncPools.pop();
                emit QsSyncPoolsRemoved(qsSyncPools.length, qsPool);
            }
        }
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    // ---  logic

    function payoutDone() external override onlyExchanger {
        for (uint256 i = 0; i < qsSyncPools.length; i++) {
            QsSyncPool(qsSyncPools[i]).sync();
        }
    }

    function getAllQsSyncPools() external view returns (address[] memory) {
        return qsSyncPools;
    }
}


interface QsSyncPool {
    function sync() external;
}
