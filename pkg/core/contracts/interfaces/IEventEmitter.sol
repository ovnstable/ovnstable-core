// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IEventEmitter {

    enum StrategyType {
        ETS,
        SPER
    }
    
    event PayoutEvent(address strategyAddress, StrategyType strategyType, uint256 profitFee, uint256 profit, uint256 loss, uint256 collectorAmount);

    function emitEvent(StrategyType strategyType, uint256 profitFee, uint256 profit, uint256 loss, uint256 collectorAmount) external;

}
