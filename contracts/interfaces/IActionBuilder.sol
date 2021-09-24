// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IMark2Market.sol";
import "./ITokenExchange.sol";

interface IActionBuilder {
    struct ExchangeAction {
        ITokenExchange tokenExchange;
        string code;
        IERC20 from;
        IERC20 to;
        uint256 amount;
        bool executed;
    }

    function getActionCode() external pure returns (string memory);

    function buildAction(
        IMark2Market.TotalAssetPrices memory assetPrices,
        ExchangeAction[] memory actions
    ) external view returns (ExchangeAction memory);
}
