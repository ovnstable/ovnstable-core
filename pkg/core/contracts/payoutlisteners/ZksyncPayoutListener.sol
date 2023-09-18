// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { ISyncSwapVault } from "@overnight-contracts/connectors/contracts/stuff/Syncswap.sol";
import { IRebaseWrapper } from "@overnight-contracts/connectors/contracts/stuff/VelocoreV2.sol";
import "../GlobalPayoutListener.sol";

contract ZksyncPayoutListener is GlobalPayoutListener {


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    function zksync() external {
    }

    function _custom(Item memory item) internal override {
        bytes32 dexName = keccak256(bytes(item.dexName));
        if (dexName == keccak256(bytes('SyncSwap'))) {
            _customSyncSwap(item);
        } else if (dexName == keccak256(bytes('VelocoreV2'))) {
            _customVelocoreV2(item);
        }
    }

    function _customSyncSwap(Item memory item) internal {
        uint256 amount = ISyncSwapVault(0x621425a1Ef6abE91058E9712575dcc4258F8d091).deposit(item.token, item.to);
        emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, amount, item.to);
    }

    function _customVelocoreV2(Item memory item) internal {
        IERC20 token = IERC20(item.token);
        uint256 tokenBalanceBeforeSkim = token.balanceOf(address(this));
        IRebaseWrapper(item.pool).skim();
        uint256 amountToken = token.balanceOf(address(this)) - tokenBalanceBeforeSkim;
        if (amountToken > 0) {
            if (item.feePercent > 0) {
                uint256 feeAmount = amountToken * item.feePercent / 100;
                amountToken -= feeAmount;
                if (feeAmount > 0) {
                    token.transfer(item.feeReceiver, feeAmount);
                    emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, feeAmount, item.feeReceiver);
                }
            }
            if (amountToken > 0) {
                token.transfer(item.to, amountToken);
                emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, amountToken, item.to);
            }
        }
    }
}
