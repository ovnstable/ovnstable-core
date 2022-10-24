// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;


import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../PayoutListener.sol";


contract BscPayoutListener is PayoutListener {

    address[] public qsSyncPools;

    address[] public pancakeSkimPools;
    address public pancakeDepositWallet;

    IERC20 public usdPlus;

    // ---  events

    event QsSyncPoolsUpdated(uint256 index, address pool);
    event QsSyncPoolsRemoved(uint256 index, address pool);
    event PancakeSkimPoolsUpdated(address[] pool);
    event PancakeDepositWalletUpdated(address wallet);
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

    function setPancakeSkimPools(address[] calldata _pancakeSkimPools) external onlyAdmin {
        require(_pancakeSkimPools.length != 0, "Zero pools not allowed");
        pancakeSkimPools = _pancakeSkimPools;
        emit PancakeSkimPoolsUpdated(_pancakeSkimPools);
    }

    function setPancakeDepositWallet(address _pancakeDepositWallet) external onlyAdmin {
        require(_pancakeDepositWallet != address(0), "Zero address not allowed");
        pancakeDepositWallet = _pancakeDepositWallet;
        emit PancakeDepositWalletUpdated(_pancakeDepositWallet);
    }

    function setUsdPlus(address _usdPlus) external onlyAdmin {
        require(_usdPlus != address(0), "Zero address not allowed");
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
        for (uint256 i = 0; i < pancakeSkimPools.length; i++) {
            address pool = pancakeSkimPools[i];
            uint256 usdPlusBalance = usdPlus.balanceOf(address(this));
            QsSyncPool(pool).skim(address(this));
            uint256 delta = usdPlus.balanceOf(address(this)) - usdPlusBalance;
            emit SkimReward(pool, delta);
        }
        uint256 totalDelta = usdPlus.balanceOf(address(this)) - usdPlusBalanceBefore;
        if (totalDelta > 0) {
            usdPlus.transfer(pancakeDepositWallet, totalDelta);
        }
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
