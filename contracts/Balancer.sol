// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IActionBuilder.sol";
import "./interfaces/ITokenExchange.sol";
import "./token_exchanges/Usdc2AUsdcTokenExchange.sol";

//TODO: use AccessControl or Ownable from zeppelin
contract Balancer is AccessControl {
    // ---  fields

    IMark2Market public m2m;
    address[] public actionBuildersInOrder;

    // ---  events

    //TODO: remove
    event ConsoleLog(string str);

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
    }

    function setActionBuilders(address[] calldata _actionBuildersInOrder) external onlyAdmin {
        for (uint8 i = 0; i < _actionBuildersInOrder.length; i++) {
            _addActionBuilderAt(_actionBuildersInOrder[i], i);
        }
        // truncate array if needed
        if (actionBuildersInOrder.length > _actionBuildersInOrder.length) {
            uint256 removeCount = actionBuildersInOrder.length - _actionBuildersInOrder.length;
            for (uint8 i = 0; i < removeCount; i++) {
                actionBuildersInOrder.pop();
            }
        }
    }

    function addActionBuilderAt(address actionBuilder, uint256 index) external onlyAdmin {
        _addActionBuilderAt(actionBuilder, index);
    }

    function _addActionBuilderAt(address actionBuilder, uint256 index) internal {
        uint256 currentlength = actionBuildersInOrder.length;
        // expand array id needed
        if (currentlength == 0 || currentlength - 1 < index) {
            uint256 additionalCount = index - currentlength + 1;
            for (uint8 i = 0; i < additionalCount; i++) {
                actionBuildersInOrder.push();
            }
        }
        actionBuildersInOrder[index] = actionBuilder;
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
        try m2m.assetPricesForBalance(address(withdrawToken), withdrawAmount) returns (
            IMark2Market.TotalAssetPrices memory assetPrices
        ) {
            // // 1. get current prices from M2M
            // IMark2Market.TotalAssetPrices memory assetPrices = m2m.assetPricesForBalance(
            //     address(withdrawToken),
            //     withdrawAmount
            // );

            // 2. calc total price
            uint256 totalUsdcPrice = assetPrices.totalUsdcPrice;

            //TODO: remove
            log("totalUsdcPrice: ", totalUsdcPrice);

            // 3. make actions
            IActionBuilder.ExchangeAction[]
                memory actionOrder = new IActionBuilder.ExchangeAction[](
                    actionBuildersInOrder.length
                );
            //TODO: remove
            log("actionBuildersInOrder.length: ", actionBuildersInOrder.length);

            for (uint8 i = 0; i < actionBuildersInOrder.length; i++) {
                try
                    IActionBuilder(actionBuildersInOrder[i]).buildAction(assetPrices, actionOrder)
                returns (IActionBuilder.ExchangeAction memory action) {
                    actionOrder[i] = action;
                } catch Error(string memory reason) {
                    revert(
                        string(
                            abi.encodePacked(
                                uint2str(i),
                                " ",
                                reason,
                                "| IActionBuilder.buildAction: code: ",
                                IActionBuilder(actionBuildersInOrder[i]).getActionCode()
                            )
                        )
                    );
                } catch {
                    revert(
                        string(
                            abi.encodePacked(
                                uint2str(i),
                                "| IActionBuilder.buildAction: code: ",
                                IActionBuilder(actionBuildersInOrder[i]).getActionCode()
                            )
                        )
                    );
                }

                // IActionBuilder.ExchangeAction memory action = IActionBuilder(actionBuildersInOrder[i])
                //     .buildAction(assetPrices, actionOrder);
                // actionOrder[i] = action;
            }
            //TODO: remove
            log("actionOrder.length: ", actionOrder.length);

            return actionOrder;
        } catch Error(string memory reason) {
            revert(
                string(
                    abi.encodePacked(
                        reason,
                        "| m2m.assetPricesForBalance: No reason ",
                        " withdrawToken ",
                        toAsciiString(address(withdrawToken)),
                        " withdrawAmount ",
                        uint2str(withdrawAmount)
                    )
                )
            );
        } catch {
            revert(
                string(
                    abi.encodePacked(
                        "m2m.assetPricesForBalance: No reason ",
                        " withdrawToken ",
                        toAsciiString(address(withdrawToken)),
                        " withdrawAmount ",
                        uint2str(withdrawAmount)
                    )
                )
            );
        }

        // // 1. get current prices from M2M
        // IMark2Market.TotalAssetPrices memory assetPrices = m2m.assetPricesForBalance(
        //     address(withdrawToken),
        //     withdrawAmount
        // );

        // // 2. calc total price
        // uint256 totalUsdcPrice = assetPrices.totalUsdcPrice;

        // //TODO: remove
        // log("totalUsdcPrice: ", totalUsdcPrice);

        // // 3. make actions
        // IActionBuilder.ExchangeAction[]
        //     memory actionOrder = new IActionBuilder.ExchangeAction[](
        //         actionBuildersInOrder.length
        //     );
        // //TODO: remove
        // log("actionBuildersInOrder.length: ", actionBuildersInOrder.length);

        // for (uint8 i = 0; i < actionBuildersInOrder.length; i++) {
        //     IActionBuilder.ExchangeAction memory action = IActionBuilder(actionBuildersInOrder[i])
        //         .buildAction(assetPrices, actionOrder);
        //     actionOrder[i] = action;
        // }
        // //TODO: remove
        // log("actionOrder.length: ", actionOrder.length);

        // return actionOrder;
    }

    //TODO: remove
    function log(string memory message, uint value) internal {
        emit ConsoleLog(string(abi.encodePacked(message, uint2str(value))));
    }

    //TODO: remove
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = char(hi);
            s[2 * i + 1] = char(lo);
        }
        return string(s);
    }

    //TODO: remove
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
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
