// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ITokenExchange.sol";
import "../interfaces/IActionBuilder.sol";
import "../interfaces/IMark2Market.sol";

contract Bal2UsdcActionBuilder is IActionBuilder {
    bytes32 constant ACTION_CODE = keccak256("Bal2Usdc");

    ITokenExchange public tokenExchange;
    IERC20 public usdcToken;
    IERC20 public balToken;

    constructor(
        address _tokenExchange,
        address _usdcToken,
        address _balToken
    ) {
        require(_tokenExchange != address(0), "Zero address not allowed");
        require(_usdcToken != address(0), "Zero address not allowed");
        require(_balToken != address(0), "Zero address not allowed");

        tokenExchange = ITokenExchange(_tokenExchange);
        usdcToken = IERC20(_usdcToken);
        balToken = IERC20(_balToken);
    }

    function getActionCode() external pure override returns (bytes32) {
        return ACTION_CODE;
    }

    function buildAction(
        IMark2Market.BalanceAssetPrices[] memory assetPrices,
        ExchangeAction[] memory actions
    ) external view override returns (ExchangeAction memory) {
        // get diff from iteration over prices because can't use mapping in memory params to external functions
        IMark2Market.BalanceAssetPrices memory balPrices;
        IMark2Market.BalanceAssetPrices memory usdcPrices;
        for (uint8 i = 0; i < assetPrices.length; i++) {
            if (assetPrices[i].asset == address(balToken)) {
                balPrices = assetPrices[i];
            } else if (assetPrices[i].asset == address(usdcToken)) {
                usdcPrices = assetPrices[i];
            }
        }

        // because we know that bal is leaf in tree and we can use this value
        int256 diff = balPrices.diffToTarget;

        uint256 amount;
        IERC20 from;
        IERC20 to;
        bool targetIsZero;
        if (balPrices.targetIsZero || diff < 0) {
            amount = uint256(- diff);
            from = balToken;
            to = usdcToken;
            targetIsZero = balPrices.targetIsZero;
        } else {
            // never comes because only allow exchange BAL to USDC
            amount = uint256(diff);
            from = usdcToken;
            to = balToken;
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
