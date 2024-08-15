// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "../GlobalPayoutListener.sol";
import "@overnight-contracts/connectors/contracts/stuff/Sushiswap.sol";

contract PolygonPayoutListener is GlobalPayoutListener {

    // ---  constructor

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() initializer public {
        __PayoutListener_init();
    }

    function polygon() external {
    }

    function _custom(Item memory item) internal override {
        if (keccak256(bytes(item.dexName)) == keccak256(bytes('SushiSwap'))) {
            IERC20 token = IERC20(item.token);
            uint256 tokenBalance = token.balanceOf(item.pool);
            uint256 tokenBalanceInPool = uint256(IBentoBox(item.pool).totals(token).elastic);
            if (tokenBalance > tokenBalanceInPool) {
                uint256 delta = tokenBalance - tokenBalanceInPool;
                IBentoBox(item.pool).deposit(token, item.pool, item.to, delta, 0);
                emit PoolOperation(item.dexName, 'Skim', item.poolName, item.pool, item.token, delta, item.to);
            }
        }
    }

}
