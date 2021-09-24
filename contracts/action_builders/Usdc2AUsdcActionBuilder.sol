// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IConnector.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";
import "../token_exchanges/Usdc2AUsdcTokenExchange.sol";

contract Usdc2AUsdcActionBuilder is IActionBuilder {
    string constant ACTION_CODE = "Usc2AUsdc";

    ITokenExchange tokenExchange;
    IERC20 usdcToken;
    IERC20 aUsdcToken;

    constructor(
        address _tokenExchange,
        address _usdcToken,
        address _aUsdcToken
    ) {
        tokenExchange = ITokenExchange(_tokenExchange);
        usdcToken = IERC20(_usdcToken);
        aUsdcToken = IERC20(_aUsdcToken);
    }

    function getActionCode() external pure override returns (string memory) {
        return ACTION_CODE;
    }

    function buildAction(
        IMark2Market.TotalAssetPrices memory totalAssetPrices,
        ExchangeAction[] memory actions
    ) external view override returns (ExchangeAction memory) {
        IMark2Market.AssetPrices[] memory assetPrices = totalAssetPrices.assetPrices;

        // get diff from iteration over prices because can't use mapping in memory params to external functions
        uint256 diff = 0;
        int8 sign = 0;
        for (uint8 i = 0; i < assetPrices.length; i++) {
            // here we need USDC diff to make action right
            if (assetPrices[i].asset == address(usdcToken)) {
                diff = assetPrices[i].diffToTarget;
                sign = assetPrices[i].diffToTargetSign;
                break;
            }
        }

        IERC20 from;
        IERC20 to;
        if (sign > 0) {
            from = aUsdcToken;
            to = usdcToken;
        } else {
            from = usdcToken;
            to = aUsdcToken;
        }

        ExchangeAction memory action = ExchangeAction(
            tokenExchange,
            ACTION_CODE,
            from,
            to,
            diff,
            false
        );

        return action;
    }
}
