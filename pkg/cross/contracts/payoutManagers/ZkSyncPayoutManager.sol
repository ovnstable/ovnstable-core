// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;
import "../PayoutManager.sol";

import { ISyncSwapVault } from "@overnight-contracts/connectors/contracts/stuff/Syncswap.sol";
import {
    IRebaseWrapper,
    VelocoreV2Library,
    ILinearBribeFactory,
    OperationType,
    AmountType
} from "@overnight-contracts/connectors/contracts/stuff/VelocoreV2.sol";

contract ZkSyncPayoutManager is PayoutManager {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutManager_init();
    }


    function zkSync() external {

    }

    function _custom(NonRebaseInfo memory info, Item memory item) internal override {
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
                    emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, feeAmount, item.feeReceiver);
                }
            }

            if (amountToken > 0) {
                address vault = address(0xf5E67261CB357eDb6C7719fEFAFaaB280cB5E2A6);
                address bribe = ILinearBribeFactory(address(0xc137d074DB1F839700eA8bb16d1eF2903e2DE7B2)).bribes(VelocoreV2Library.toToken(item.pool));
                address gauge = item.bribe;
                uint32 begin = _getVelocoreBribeBeginTimestamp(); // require ((begin % 3600) == 0)
                uint32 end = begin + 604800; // begin + 1 week. require ((end % 3600) == 0)

                token.approve(item.pool, amountToken);
                IRebaseWrapper(item.pool).depositExactIn(amountToken);
                uint256 rebaseBalance = IRebaseWrapper(item.pool).balanceOf(address(this)); // bribe all wrapped tokens

                // bribeAmount <= rebaseBalance because of rounding bribeSum % duration_in_seconds
                uint256 bribeAmount = VelocoreV2Library.run1(
                    vault,
                    0,
                    bribe,
                    OperationType.SWAP,
                    item.pool,
                    AmountType.EXACTLY,
                    rebaseBalance,
                    abi.encode(gauge, begin, 0, end, 0)
                );

                emit PoolOperation(item.dexName, 'Bribe', item.poolName, item.pool, item.token, bribeAmount, gauge);
            }
        }
    }

    function _getVelocoreBribeBeginTimestamp() internal returns (uint32) {
        uint256 beginHours = block.timestamp / 3600 + 1; // get total hours rounding down and add 1 hour
        return uint32(beginHours * 3600); // return begin timestamp
    }
}
