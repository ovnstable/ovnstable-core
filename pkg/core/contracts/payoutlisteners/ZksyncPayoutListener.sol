// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../GlobalPayoutListener.sol";

contract ZksyncPayoutListener is GlobalPayoutListener {


    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }



    function _custom(Item memory item) internal override {

        if(keccak256(bytes(item.dexName)) == keccak256(bytes('SyncSwap'))){
            uint256 amount = SyncSwapVault(0x621425a1Ef6abE91058E9712575dcc4258F8d091).deposit(item.token, item.to);
            emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, amount, item.to);
        }
    }
}


interface SyncSwapVault {

    function deposit(address token, address to) external returns (uint amount);
}
