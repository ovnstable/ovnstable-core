// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";

contract WMatic2UsdcActionBuilder is IActionBuilder {
    bytes32 constant ACTION_CODE = keccak256("Usc2AUsdc");

    ITokenExchange tokenExchange;
    IERC20 usdcToken;
    IERC20 wMaticToken;

    constructor(
        address _tokenExchange,
        address _usdcToken,
        address _wMaticToken
    ) {
        require(_tokenExchange != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_wMaticToken != address(0), "Zero address not allowed");

        tokenExchange = ITokenExchange(_tokenExchange);
        usdcToken = IERC20(_usdcToken);
        wMaticToken = IERC20(_wMaticToken);
    }

    function getActionCode() external pure override returns (bytes32) {
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
        bool targetIsZero = false;
        for (uint8 i = 0; i < assetPrices.length; i++) {
            // here we need USDC diff to make action right
            if (assetPrices[i].asset == address(wMaticToken)) {
                diff = assetPrices[i].diffToTarget;
                sign = assetPrices[i].diffToTargetSign;
                targetIsZero = assetPrices[i].targetIsZero;
                break;
            }
        }

        IERC20 from;
        IERC20 to;
        if (sign > 0) {
            from = wMaticToken;
            to = usdcToken;
        } else {
            from = usdcToken;
            to = wMaticToken;
        }

        ExchangeAction memory action = ExchangeAction(
            tokenExchange,
            ACTION_CODE,
            from,
            to,
            diff,
            targetIsZero,
            false
        );

        return action;
    }
}
