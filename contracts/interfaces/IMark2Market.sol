// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;

interface IMark2Market {
    struct ActivesPrices {
        address addr;
        string name;
        string symbol;
        uint256 decimals;
        uint256 price;
        uint256 bookValue;
        uint256 liquidationValue;
    }

    struct AssetPrices {
        address asset;
        uint256 amountInVault; // balance on Vault
        uint256 usdcPriceOne; // current price one token at USDC
        uint256 usdcPriceInVault; // current total price of balance at USDC
        uint256 diffToTarget; // diff usdcPriceInVault to target in portfolio
        int8 diffToTargetSign; // diff sign usdcPriceInVault to target in portfolio
        //
        uint256 usdcPriceDenominator;
        uint256 usdcSellPrice;
        uint256 usdcBuyPrice;
        uint256 usdcPriceInVault2;
    }

    struct TotalAssetPrices {
        AssetPrices[] assetPrices;
        uint256 totalUsdcPrice;
    }

    function activesPrices() external view returns (ActivesPrices[] memory);

    function assetPricesForBalance() external returns (TotalAssetPrices memory);

    function assetPricesForBalance(address withdrawToken, uint256 withdrawAmount)
        external
        returns (TotalAssetPrices memory);
}
