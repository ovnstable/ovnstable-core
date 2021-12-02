// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IPriceGetter.sol";
import "./OwnableExt.sol";
import "./registries/Portfolio.sol";
import "./Vault.sol";
import "hardhat/console.sol";

//TODO: use AccessControl or Ownable from zeppelin
contract Mark2Market is IMark2Market, OwnableExt {
    Vault public vault;
    Portfolio public portfolio;

    function init(address _vault, address _portfolio) public onlyOwner {
        require(_vault != address(0), "Zero address not allowed");
        require(_portfolio != address(0), "Zero address not allowed");
        vault = Vault(_vault);
        portfolio = Portfolio(_portfolio);
    }

    function assetPrices() public view override returns (TotalAssetPrices memory) {
        Portfolio.AssetInfo[] memory assetInfos = portfolio.getAllAssetInfos();

        uint256 totalUsdcPrice = 0;
        uint256 count = assetInfos.length;
        AssetPrices[] memory assetPrices = new AssetPrices[](count);
        for (uint8 i = 0; i < count; i++) {
            Portfolio.AssetInfo memory assetInfo = assetInfos[i];
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

    function totalUsdcPrice()
    public
    view
    override
    returns (uint256)
    {
        Portfolio.AssetWeight[] memory assetWeights = portfolio.getAllAssetWeights();

        uint256 totalUsdcPrice = 0;
        uint256 count = assetWeights.length;
        for (uint8 i = 0; i < count; i++) {
            Portfolio.AssetWeight memory assetWeight = assetWeights[i];

            uint256 amountInVault = IERC20(assetWeight.asset).balanceOf(address(vault));
            // normalize amountInVault to 18 decimals
            //TODO: denominator usage
            uint256 amountDenominator = 10**(18 - IERC20Metadata(assetWeight.asset).decimals());
            amountInVault = amountInVault * amountDenominator;

            Portfolio.AssetInfo memory assetInfo = portfolio.getAssetInfo(assetWeight.asset);
            IPriceGetter priceGetter = IPriceGetter(assetInfo.priceGetter);

            uint256 usdcPriceDenominator = priceGetter.denominator();
            uint256 usdcSellPrice = priceGetter.getUsdcSellPrice();

            // in decimals: 18 + 18 - 18 => 18
            uint256 usdcPriceInVault = (amountInVault * usdcSellPrice) / usdcPriceDenominator;

            totalUsdcPrice += usdcPriceInVault;
        }

        return totalUsdcPrice;
    }


    function assetPricesForBalance() external view override returns (BalanceAssetPrices[] memory) {
        return assetPricesForBalance(address(0), 0);
    }

    /**
     * @param withdrawToken Token to withdraw
     * @param withdrawAmount Not normalized amount to withdraw
     */
    function assetPricesForBalance(address withdrawToken, uint256 withdrawAmount)
        public
        view
        override
        returns (BalanceAssetPrices[] memory)
    {
        console.log("assetPricesForBalance: start\t%s", gasleft());
        if (withdrawToken != address(0)) {
            // normalize withdrawAmount to 18 decimals
            //TODO: denominator usage
            uint256 withdrawAmountDenominator = 10**(18 - IERC20Metadata(withdrawToken).decimals());
            withdrawAmount = withdrawAmount * withdrawAmountDenominator;
        }

        Portfolio.AssetWeight[] memory assetWeights = portfolio
            .getAllAssetWeights();
        console.log("assetPricesForBalance: getAllAssetWeights\t%s", gasleft());

        uint256 totalUsdcPrice = 0;
        uint256 count = assetWeights.length;
//        BalanceAssetPrices[] memory assetPrices = new AssetPrices[](count);
console.log("assetPricesForBalance: before loop\t%s", gasleft());
        for (uint8 i = 0; i < count; i++) {
            console.log("assetPricesForBalance: new iteration\t%s", gasleft());
            Portfolio.AssetWeight memory assetWeight = assetWeights[i];

            uint256 amountInVault = IERC20(assetWeight.asset).balanceOf(address(vault));
            // normalize amountInVault to 18 decimals
            //TODO: denominator usage
            uint256 amountDenominator = 10**(18 - IERC20Metadata(assetWeight.asset).decimals());
            amountInVault = amountInVault * amountDenominator;
console.log("assetPricesForBalance: amountInVault\t%s", gasleft());

            Portfolio.AssetInfo memory assetInfo = portfolio.getAssetInfo(
                assetWeight.asset
            );
console.log("assetPricesForBalance: assetInfo\t%s", gasleft());
            IPriceGetter priceGetter = IPriceGetter(assetInfo.priceGetter);
console.log("assetPricesForBalance: priceGetter\t%s", gasleft());

            uint256 usdcPriceDenominator = priceGetter.denominator();
console.log("assetPricesForBalance: usdcPriceDenominator\t%s", gasleft());
            uint256 usdcSellPrice = priceGetter.getUsdcSellPrice();
console.log("assetPricesForBalance: usdcSellPrice\t%s", gasleft());
//            uint256 usdcBuyPrice = priceGetter.getUsdcBuyPrice();
console.log("assetPricesForBalance: usdcBuyPrice\t%s", gasleft());

            // in decimals: 18 + 18 - 18 => 18
            uint256 usdcPriceInVault = (amountInVault * usdcSellPrice) / usdcPriceDenominator;

            totalUsdcPrice += usdcPriceInVault;
console.log("assetPricesForBalance: totalUsdcPrice\t%s", gasleft());

//            assetPrices[i] = AssetPrices(
//                assetWeight.asset,
//                amountInVault,
//                usdcPriceInVault,
//                0,
//                false
//            ,
//                usdcPriceDenominator,
//                usdcSellPrice,
//                0,
//                IERC20Metadata(assetWeight.asset).decimals(),
//                IERC20Metadata(assetWeight.asset).name(),
//                IERC20Metadata(assetWeight.asset).symbol()
//            );
console.log("assetPricesForBalance: assetPrices\t%s", gasleft());
        }
console.log("assetPricesForBalance: end loop\t%s", gasleft());

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
console.log("assetPricesForBalance: if\t%s", gasleft());

        // 4. correct total with withdrawAmount
        totalUsdcPrice = totalUsdcPrice - withdrawAmount;
console.log("assetPricesForBalance: totalUsdcPrice corrected\t%s", gasleft());

        BalanceAssetPrices[] memory assetPrices = new BalanceAssetPrices[](count);
        for (uint8 i = 0; i < count; i++) {
            console.log("assetPricesForBalance: diff loop iteration\t%s", gasleft());
            Portfolio.AssetWeight memory assetWeight = assetWeights[i];
            int256 diffToTarget = 0;
            bool targetIsZero = false;
            (diffToTarget, targetIsZero) = _diffToTarget(totalUsdcPrice, assetWeight);

            // update diff for withdrawn token
            if (withdrawAmount > 0 && assetWeight.asset == withdrawToken) {
                diffToTarget = diffToTarget + int256(withdrawAmount);
            }
            assetPrices[i] = BalanceAssetPrices(
                assetWeight.asset,
                diffToTarget,
                targetIsZero
            );
            console.log("assetPricesForBalance: assetPrice\t%s", gasleft());
        }
console.log("assetPricesForBalance: diff loop end\t%s", gasleft());

        console.log("assetPricesForBalance: totalPrices\t%s", gasleft());

        return assetPrices;
    }

    /**
     * @param totalUsdcPrice - Total normilized to 10**18
     * @param assetWeight - Token address to calc
     * @return normilized to 10**18 signed diff amount and mark that mean that need sell all
     */
    function _diffToTarget(uint256 totalUsdcPrice, Portfolio.AssetWeight memory assetWeight)
        internal
        view
        returns (
            int256,
            bool
        )
    {
console.log("diffToTarget: start\t%s", gasleft());
//        Portfolio.AssetWeight memory assetWeight = portfolio.getAssetWeight(
//            asset
//        );
        address asset = assetWeight.asset;
console.log("diffToTarget: getAssetWeight\t%s", gasleft());

        uint256 targetUsdcAmount = (totalUsdcPrice * assetWeight.targetWeight) /
            portfolio.TOTAL_WEIGHT();

        Portfolio.AssetInfo memory assetInfo = portfolio.getAssetInfo(asset);
        console.log("diffToTarget: assetInfo\t%s", gasleft());
        IPriceGetter priceGetter = IPriceGetter(assetInfo.priceGetter);
console.log("diffToTarget: priceGetter\t%s", gasleft());

        uint256 usdcPriceDenominator = priceGetter.denominator();
console.log("diffToTarget: usdcPriceDenominator\t%s", gasleft());
        uint256 usdcBuyPrice = priceGetter.getUsdcBuyPrice();
console.log("diffToTarget: usdcBuyPrice\t%s", gasleft());

        // in decimals: 18 * 18 / 18 => 18
        uint256 targetTokenAmount = (targetUsdcAmount * usdcPriceDenominator) / usdcBuyPrice;

        // normalize currentAmount to 18 decimals
        uint256 currentAmount = IERC20(asset).balanceOf(address(vault));
        //TODO: denominator usage
        uint256 denominator = 10**(18 - IERC20Metadata(asset).decimals());
        currentAmount = currentAmount * denominator;
console.log("diffToTarget: currentAmount\t%s", gasleft());

        bool targetIsZero;
        if (targetTokenAmount == 0) {
            targetIsZero = true;
        } else {
            targetIsZero = false;
        }

        int256 diff = int256(targetTokenAmount) - int256(currentAmount);
        console.log("diffToTarget: end\t%s", gasleft());
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

}
