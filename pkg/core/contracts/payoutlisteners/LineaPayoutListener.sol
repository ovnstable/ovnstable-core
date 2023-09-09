// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import { IRebaseWrapper } from "@overnight-contracts/connectors/contracts/stuff/VelocoreV2.sol";
import "../GlobalPayoutListener.sol";

contract LineaPayoutListener is GlobalPayoutListener {

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    function linea() external {

    }

    function _custom(Item memory item) internal override {
        if (keccak256(bytes(item.dexName)) == keccak256(bytes('Velocore'))) {
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
}


