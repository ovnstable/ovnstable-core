// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/// @title Common inrterface to DeFi protocol connectors
/// @author @Stanta
/// @notice Every connector have to implement this function
/// @dev Choosing of connector releasing by changing address of connector's contract

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IActionBuilder.sol";
import "./interfaces/ITokenExchange.sol";
import "./registries/InvestmentPortfolio.sol";
import "./registries/InvestmentPortfolio.sol";
import "./interfaces/IConnector.sol";
import "./token_exchanges/Usdc2AUsdcTokenExchange.sol";

contract Balancer {
    IMark2Market m2m;
    InvestmentPortfolio investmentPortfolio;
    address[] actionBuildersInOrder;

    //TODO: remove
    event ConsoleLog(string str);

    function setMark2Market(address _m2m) public {
        require(_m2m != address(0), "Zero address not allowed");
        m2m = IMark2Market(_m2m);
    }

    function addActionBuilderAt(address actionBuilder, uint256 index) public {
        uint256 currentlength = actionBuildersInOrder.length;
        if (currentlength == 0 || currentlength - 1 < index) {
            uint256 additionalCount = index - currentlength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                actionBuildersInOrder.push();
            }
        }
        actionBuildersInOrder[index] = actionBuilder;
    }

    function setActionBuilders(address[] memory _actionBuildersInOrder) public {
        for (uint8 i = 0; i < _actionBuildersInOrder.length; i++) {
            addActionBuilderAt(_actionBuildersInOrder[i], i);
            // actionBuildersInOrder[i] = _actionBuildersInOrder[i];
        }
        if (actionBuildersInOrder.length > _actionBuildersInOrder.length) {
            uint256 removeCount = actionBuildersInOrder.length - _actionBuildersInOrder.length;
            for (uint8 i = 0; i < removeCount; i++) {
                actionBuildersInOrder.pop();
            }
        }
    }

    function balanceActions() public returns (IActionBuilder.ExchangeAction[] memory) {
        // 1. get current prices from M2M
        IMark2Market.TotalAssetPrices memory assetPrices = m2m.assetPricesForBalance();

        // 2. calc total price
        uint256 totalUsdcPrice = assetPrices.totalUsdcPrice;
        //TODO: remove
        emit ConsoleLog(string(abi.encodePacked("totalUsdcPrice: ", uint2str(totalUsdcPrice))));

        // 3. make actions
        IActionBuilder.ExchangeAction[] memory actionOrder = new IActionBuilder.ExchangeAction[](
            actionBuildersInOrder.length
        );
        //TODO: remove
        emit ConsoleLog(string(abi.encodePacked("actionBuildersInOrder.length: ", uint2str(actionBuildersInOrder.length))));
        for (uint8 i = 0; i < actionBuildersInOrder.length; i++) {
            IActionBuilder.ExchangeAction memory action = IActionBuilder(actionBuildersInOrder[i])
                .buildAction(assetPrices, actionOrder);
            actionOrder[i] = action;
        }

        return actionOrder;
    }

    //TODO: remove
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            bstr[k] = bytes1(uint8(48 + (_i % 10)));
            _i /= 10;
        }
        return string(bstr);
    }
}
