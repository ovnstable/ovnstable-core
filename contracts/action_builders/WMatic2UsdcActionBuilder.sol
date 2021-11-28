// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";

contract WMatic2UsdcActionBuilder is IActionBuilder {
    bytes32 constant ACTION_CODE = keccak256("WMatic2Usdc");

    ITokenExchange public tokenExchange;
    IERC20 public usdcToken;
    IERC20 public wMaticToken;

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
        IMark2Market.AssetPrices memory wMaticPrices;
        IMark2Market.AssetPrices memory usdcPrices;
        for (uint8 i = 0; i < assetPrices.length; i++) {
            if (assetPrices[i].asset == address(wMaticToken)) {
                wMaticPrices = assetPrices[i];
                continue;
            }
            if (assetPrices[i].asset == address(usdcToken)) {
                usdcPrices = assetPrices[i];
                continue;
            }
        }

        // because we know that wMatic is leaf in tree and we can use this value
        int256 diff = wMaticPrices.diffToTarget;

        uint256 amount;
        IERC20 from;
        IERC20 to;
        bool targetIsZero;
        if (wMaticPrices.targetIsZero || diff < 0) {
            amount = uint256(- diff);
            from = wMaticToken;
            to = usdcToken;
            targetIsZero = wMaticPrices.targetIsZero;
        } else {
            amount = uint256(diff);
            from = usdcToken;
            to = wMaticToken;
            targetIsZero = usdcPrices.targetIsZero;
        }

        ExchangeAction memory action = ExchangeAction(
            tokenExchange,
            ACTION_CODE,
            from,
            to,
            amount,
            targetIsZero,
            false
        );

        return action;
    }
}
