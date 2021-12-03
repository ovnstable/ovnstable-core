// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IActionBuilder.sol";
import "./interfaces/ITokenExchange.sol";
import "./token_exchanges/Usdc2AUsdcTokenExchange.sol";

contract Balancer is AccessControl {
    // ---  fields

    IMark2Market public m2m;
    address[] public actionBuilders;

    // ---  events

    event Mark2MarketUpdated(address m2m);
    event ActionBuilderUpdated(address actionBuilder, uint256 index);
    event ActionBuilderRemoved(uint256 index);

    // ---  modifiers

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Restricted to admins");
        _;
    }

    // ---  constructor

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ---  setters

    function setMark2Market(address _m2m) external onlyAdmin {
        require(_m2m != address(0), "Zero address not allowed");
        m2m = IMark2Market(_m2m);
        emit Mark2MarketUpdated(_m2m);
    }

    function setActionBuilders(address[] calldata _actionBuildersInOrder) external onlyAdmin {
        for (uint8 i = 0; i < _actionBuildersInOrder.length; i++) {
            _addActionBuilderAt(_actionBuildersInOrder[i], i);
        }
        // truncate array if needed
        if (actionBuilders.length > _actionBuildersInOrder.length) {
            uint256 removeCount = actionBuilders.length - _actionBuildersInOrder.length;
            for (uint8 i = 0; i < removeCount; i++) {
                actionBuilders.pop();
                emit ActionBuilderRemoved(actionBuilders.length - i - 1);
            }
        }
    }

    function addActionBuilderAt(address actionBuilder, uint256 index) external onlyAdmin {
        _addActionBuilderAt(actionBuilder, index);
    }

    function _addActionBuilderAt(address actionBuilder, uint256 index) internal {
        uint256 currentLength = actionBuilders.length;
        // expand array id needed
        if (currentLength == 0 || currentLength - 1 < index) {
            uint256 additionalCount = index - currentLength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                actionBuilders.push();
                emit ActionBuilderUpdated(address(0), i);
            }
        }
        actionBuilders[index] = actionBuilder;
        emit ActionBuilderUpdated(actionBuilder, index);
    }

    // ---  logic

    function buildBalanceActions() public returns (IActionBuilder.ExchangeAction[] memory) {
        // Same to zero withdrawal balance
        return buildBalanceActions(IERC20(address(0)), 0);
    }

    function buildBalanceActions(IERC20 withdrawToken, uint256 withdrawAmount)
        public
        returns (IActionBuilder.ExchangeAction[] memory)
    {
         // 1. get current prices from M2M
        IMark2Market.BalanceAssetPrices[] memory assetPrices = m2m.assetPricesForBalance(
            address(withdrawToken),
            withdrawAmount
        );

        // 2. make actions
        IActionBuilder.ExchangeAction[] memory actionOrder = new IActionBuilder.ExchangeAction[](
            actionBuilders.length
        );

        for (uint8 i = 0; i < actionBuilders.length; i++) {
            actionOrder[i] = IActionBuilder(actionBuilders[i]).buildAction(assetPrices, actionOrder);
        }
        return actionOrder;
    }
}
