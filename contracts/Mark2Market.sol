// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IPriceGetter.sol";
import "./OwnableExt.sol";
import "./registries/InvestmentPortfolio.sol";
import "./Vault.sol";

//TODO: use AccessControl or Ownable from zeppelin
contract Mark2Market is IMark2Market, OwnableExt {
    Vault public vault;
    InvestmentPortfolio public investmentPortfolio;

    //TODO: remove
    event ConsoleLog(string str);

    function init(address _vault, address _investmentPortfolio) public onlyOwner {
        require(_vault != address(0), "Zero address not allowed");
        require(_investmentPortfolio != address(0), "Zero address not allowed");
        vault = Vault(_vault);
        investmentPortfolio = InvestmentPortfolio(_investmentPortfolio);
    }

    function assetPrices() public view override returns (TotalAssetPrices memory) {
        InvestmentPortfolio.AssetInfo[] memory assetInfos = investmentPortfolio.getAllAssetInfos();

        uint256 totalUsdcPrice = 0;
        uint256 count = assetInfos.length;
        AssetPrices[] memory assetPrices = new AssetPrices[](count);
        for (uint8 i = 0; i < count; i++) {
            InvestmentPortfolio.AssetInfo memory assetInfo = assetInfos[i];
            uint256 amountInVault = IERC20(assetInfo.asset).balanceOf(address(vault));
            // normilize amountInVault to 18 decimals
            //TODO: denominator usage
            uint256 amountDenominator = 10**(18 - IERC20Metadata(assetInfo.asset).decimals());
            amountInVault = amountInVault * amountDenominator;

            IPriceGetter priceGetter = IPriceGetter(assetInfo.priceGetter);

            uint256 usdcPriceDenominator = priceGetter.denominator();
            uint256 usdcSellPrice = priceGetter.getUsdcSellPrice();
            uint256 usdcBuyPrice = priceGetter.getUsdcBuyPrice();

            // in decimals: 18 + 18 - 18 => 18
            uint256 usdcPriceInVault = (amountInVault * usdcSellPrice) / usdcPriceDenominator;

            totalUsdcPrice += usdcPriceInVault;

            assetPrices[i] = AssetPrices(
                assetInfo.asset,
                amountInVault,
                usdcPriceInVault,
                0,
                false,
                usdcPriceDenominator,
                usdcSellPrice,
                usdcBuyPrice,
                IERC20Metadata(assetInfo.asset).decimals(),
                IERC20Metadata(assetInfo.asset).name(),
                IERC20Metadata(assetInfo.asset).symbol()
            );
        }

        TotalAssetPrices memory totalPrices = TotalAssetPrices(assetPrices, totalUsdcPrice);

        return totalPrices;
    }

    function assetPricesForBalance() external override returns (TotalAssetPrices memory) {
        return assetPricesForBalance(address(0), 0);
    }

    /**
     * @param withdrawToken Token to withdraw
     * @param withdrawAmount Not normilized amount to withdraw
     */
    function assetPricesForBalance(address withdrawToken, uint256 withdrawAmount)
        public
        override
        returns (TotalAssetPrices memory)
    {
        if (withdrawToken != address(0)) {
            // normilize withdrawAmount to 18 decimals
            //TODO: denominator usage
            uint256 withdrawAmountDenominator = 10**(18 - IERC20Metadata(withdrawToken).decimals());
            withdrawAmount = withdrawAmount * withdrawAmountDenominator;
        }
        // //TODO: remove
        // log("withdrawAmount: ", withdrawAmount);

        InvestmentPortfolio.AssetWeight[] memory assetWeights = investmentPortfolio
            .getAllAssetWeights();

        // //TODO: remove
        // log("assetWeights.length: ", assetWeights.length);

        uint256 totalUsdcPrice = 0;
        uint256 count = assetWeights.length;
        AssetPrices[] memory assetPrices = new AssetPrices[](count);
        for (uint8 i = 0; i < count; i++) {
            InvestmentPortfolio.AssetWeight memory assetWeight = assetWeights[i];

            uint256 amountInVault = IERC20(assetWeight.asset).balanceOf(address(vault));
            // normilize amountInVault to 18 decimals
            //TODO: denominator usage
            uint256 amountDenominator = 10**(18 - IERC20Metadata(assetWeight.asset).decimals());
            amountInVault = amountInVault * amountDenominator;
            // //TODO: remove
            // log("amountInVault: ", amountInVault);

            InvestmentPortfolio.AssetInfo memory assetInfo = investmentPortfolio.getAssetInfo(
                assetWeight.asset
            );
            IPriceGetter priceGetter = IPriceGetter(assetInfo.priceGetter);

            uint256 usdcPriceDenominator = priceGetter.denominator();
            uint256 usdcSellPrice = priceGetter.getUsdcSellPrice();
            uint256 usdcBuyPrice = priceGetter.getUsdcBuyPrice();

            // in decimals: 18 + 18 - 18 => 18
            uint256 usdcPriceInVault = (amountInVault * usdcSellPrice) / usdcPriceDenominator;

            totalUsdcPrice += usdcPriceInVault;

            assetPrices[i] = AssetPrices(
                assetWeight.asset,
                amountInVault,
                usdcPriceInVault,
                0,
                false,
                usdcPriceDenominator,
                usdcSellPrice,
                usdcBuyPrice,
                IERC20Metadata(assetWeight.asset).decimals(),
                IERC20Metadata(assetWeight.asset).name(),
                IERC20Metadata(assetWeight.asset).symbol()
            );
        }

        // 3. validate withdrawAmount
        // used if instead of require because better when need to build complex string for revert
        if (totalUsdcPrice < withdrawAmount) {
            revert(string(
                abi.encodePacked(
                    "Withdraw more than total: ",
                    uint2str(withdrawAmount),
                    " > ",
                    uint2str(totalUsdcPrice)
                )
            ));
        }

        // 4. correct total with withdrawAmount
        // //TODO: remove
        // log("totalUsdcPrice before correction: ", totalUsdcPrice);

        totalUsdcPrice = totalUsdcPrice - withdrawAmount;
        log("totalUsdcPrice after correction: ", totalUsdcPrice);

        for (uint8 i = 0; i < count; i++) {
            AssetPrices memory assetPrice = assetPrices[i];
            (
                assetPrice.diffToTarget,
                assetPrice.targetIsZero
            ) = diffToTarget(totalUsdcPrice, assetPrice.asset);

            // emit ConsoleLog(
            //     string(
            //         abi.encodePacked(
            //             uint2str(i),
            //             " | ",
            //             IERC20Metadata(assetPrice.asset).symbol(),
            //             " | ",
            //             uint2str(assetPrice.amountInVault),
            //             " | ",
            //             uint2str(assetPrice.usdcPriceInVault),
            //             " | ",
            //             uint2str(assetPrice.diffToTarget),
            //             " | ",
            //             uint2str(assetPrice.usdcSellPrice),
            //             " | ",
            //             uint2str(assetPrice.usdcBuyPrice)
            //         )
            //     )
            // );

            // update diff for withdrawn token
            if (withdrawAmount > 0 && assetPrice.asset == withdrawToken) {
                assetPrice.diffToTarget = assetPrice.diffToTarget + int256(withdrawAmount);
            }

            // emit ConsoleLog(
            //     string(
            //         abi.encodePacked(
            //             // uint2str(i),
            //             // " | ",
            //             IERC20Metadata(assetPrice.asset).symbol(),
            //             " | ",
            //             uint2str(assetPrice.amountInVault),
            //             // " | ",
            //             // uint2str(assetPrice.usdcPriceInVault),
            //             " | ",
            //             uint2str(assetPrice.diffToTarget),
            //             " | ",
            //             uint2str(assetPrice.usdcSellPrice),
            //             " | ",
            //             uint2str(assetPrice.usdcBuyPrice)
            //         )
            //     )
            // );
        }

        TotalAssetPrices memory totalPrices = TotalAssetPrices(assetPrices, totalUsdcPrice);

        return totalPrices;
    }

    /**
     * @param totalUsdcPrice - Total normilized to 10**18
     * @param asset - Token address to calc
     * @return normilized to 10**18 signed diff amount and mark that mean that need sell all
     */
    function diffToTarget(uint256 totalUsdcPrice, address asset)
        internal
        view
        returns (
            int256,
            bool
        )
    {
        InvestmentPortfolio.AssetWeight memory assetWeight = investmentPortfolio.getAssetWeight(
            asset
        );

        uint256 targetUsdcAmount = (totalUsdcPrice * assetWeight.targetWeight) /
            investmentPortfolio.TOTAL_WEIGHT();

        InvestmentPortfolio.AssetInfo memory assetInfo = investmentPortfolio.getAssetInfo(asset);
        IPriceGetter priceGetter = IPriceGetter(assetInfo.priceGetter);

        uint256 usdcPriceDenominator = priceGetter.denominator();
        uint256 usdcBuyPrice = priceGetter.getUsdcBuyPrice();

        // in decimals: 18 * 18 / 18 => 18
        uint256 targetTokenAmount = (targetUsdcAmount * usdcPriceDenominator) / usdcBuyPrice;

        // normilize currentAmount to 18 decimals
        uint256 currentAmount = IERC20(asset).balanceOf(address(vault));
        //TODO: denominator usage
        uint256 denominator = 10**(18 - IERC20Metadata(asset).decimals());
        currentAmount = currentAmount * denominator;

        bool targetIsZero;
        if (targetTokenAmount == 0) {
            targetIsZero = true;
        } else {
            targetIsZero = false;
        }

        int256 diff = int256(targetTokenAmount) - int256(currentAmount);
        return (diff, targetIsZero);
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

    //TODO: remove
    function log(string memory message, uint value) internal {
//        emit ConsoleLog(string(abi.encodePacked(message, uint2str(value))));
    }
}
