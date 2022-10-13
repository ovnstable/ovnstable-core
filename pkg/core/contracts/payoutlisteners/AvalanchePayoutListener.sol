// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../PayoutListener.sol";


contract AvalanchePayoutListener is PayoutListener {

    address[] public qsSyncPools;

    address[] public swapsicleSkimPools;
    address public swapsicleDepositWallet;

    IERC20 public usdPlus;

    // ---  events

    event QsSyncPoolsUpdated(uint256 index, address pool);
    event QsSyncPoolsRemoved(uint256 index, address pool);
    event SwapsicleSkimPoolsUpdated(uint256 index, address pool);
    event SwapsicleSkimPoolsRemoved(uint256 index, address pool);
    event SwapsicleDepositWalletUpdated(address wallet);
    event UsdPlusUpdated(address usdPlus);
    event SkimReward(address pool, uint256 amount);
    event TotalSkimReward(uint256 amount);

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

    function setSwapsicleSkimPools(address[] calldata _swapsicleSkimPools) external onlyAdmin {

        uint256 minLength = (swapsicleSkimPools.length < _swapsicleSkimPools.length) ? swapsicleSkimPools.length : _swapsicleSkimPools.length;

        // replace already exists
        for (uint256 i = 0; i < minLength; i++) {
            swapsicleSkimPools[i] = _swapsicleSkimPools[i];
            emit SwapsicleSkimPoolsUpdated(i, _swapsicleSkimPools[i]);
        }

        // add if need
        if (minLength < _swapsicleSkimPools.length) {
            for (uint256 i = minLength; i < _swapsicleSkimPools.length; i++) {
                swapsicleSkimPools.push(_swapsicleSkimPools[i]);
                emit SwapsicleSkimPoolsUpdated(i, _swapsicleSkimPools[i]);
            }
        }

        // truncate if need
        if (swapsicleSkimPools.length > _swapsicleSkimPools.length) {
            uint256 removeCount = swapsicleSkimPools.length - _swapsicleSkimPools.length;
            for (uint256 i = 0; i < removeCount; i++) {
                address qsPool = swapsicleSkimPools[swapsicleSkimPools.length - 1];
                swapsicleSkimPools.pop();
                emit SwapsicleSkimPoolsRemoved(swapsicleSkimPools.length, qsPool);
            }
        }
    }

    function setSwapsicleDepositWallet(address _swapsicleDepositWallet) external onlyAdmin {
        swapsicleDepositWallet = _swapsicleDepositWallet;
        emit SwapsicleDepositWalletUpdated(_swapsicleDepositWallet);
    }

    function setUsdPlus(address _usdPlus) external onlyAdmin {
        usdPlus = IERC20(_usdPlus);
        emit UsdPlusUpdated(_usdPlus);
    }

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    // ---  logic

    function payoutDone() external override onlyExchanger {
        _sync();
        _skim();
    }

    function _sync() internal {
        for (uint256 i = 0; i < qsSyncPools.length; i++) {
            QsSyncPool(qsSyncPools[i]).sync();
        }
    }

    function _skim() internal {
        uint256 usdPlusBalanceBefore = usdPlus.balanceOf(address(this));
        for (uint256 i = 0; i < swapsicleSkimPools.length; i++) {
            address pool = swapsicleSkimPools[i];
            uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
            QsSyncPool(pool).skim(address(this));
            uint256 delta = usdPlus.balanceOf(address(this)) - usdPlusBalance;
            emit SkimReward(pool, delta);
        }
        uint256 totalDelta = usdPlus.balanceOf(address(this)) - usdPlusBalanceBefore;
        usdPlus.transfer(swapsicleDepositWallet, totalDelta);
        emit TotalSkimReward(totalDelta);
    }

    function getAllQsSyncPools() external view returns (address[] memory) {
        return qsSyncPools;
    }
}


interface QsSyncPool {
    function sync() external;
    function skim(address to) external;
}
