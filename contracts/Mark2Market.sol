// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.0 <0.9.0;
import "./interfaces/IActivesList.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IMark2Market.sol";
import "./interfaces/IConnector.sol";
import "./interfaces/IPriceGetter.sol";
import "./OwnableExt.sol";
import "./registries/InvestmentPortfolio.sol";
import "./Vault.sol";

//TODO: use AccessControl or Ownable from zeppelin
contract Mark2Market is IMark2Market, OwnableExt {
    IActivesList private actListContr;

    uint256 private testprice;
    address private addrWault;

    Vault private vault;
    InvestmentPortfolio private investmentPortfolio;

    //TODO: remove
    event ConsoleLog(string str);

    function setAddr(address _addrAL, address _addrWault) public onlyOwner {
        require(_addrAL != address(0), "Zero address not allowed");
        require(_addrWault != address(0), "Zero address not allowed");
        actListContr = IActivesList(_addrAL);
        addrWault = _addrWault;
    }

    function init(address _vault, address _investmentPortfolio) public onlyOwner {
        require(_vault != address(0), "Zero address not allowed");
        require(_investmentPortfolio != address(0), "Zero address not allowed");
        vault = Vault(_vault);
        investmentPortfolio = InvestmentPortfolio(_investmentPortfolio);
    }

    function activesPrices() public view override returns (ActivesPrices[] memory) {
        IActivesList.Active[] memory actives = actListContr.getAllActives();
        //calculate total activites sum
        //USDC price]
        ActivesPrices[] memory ap = new ActivesPrices[](actives.length);
        for (uint8 a = 0; a < actives.length && a < 100; a++) {
            if (actives[a].isWork > 0) {
                IERC20Metadata tokAct = IERC20Metadata(actives[a].actAddress);
                uint256 price = IConnector(actives[a].connector).getPriceOffer(
                    actives[a].actAddress,
                    actives[a].poolPrice
                );
                // position
                uint256 bookValue = IConnector(actives[a].connector).getBookValue(
                    actives[a].actAddress,
                    addrWault,
                    actives[a].poolPrice
                );
                uint256 liqValue = IConnector(actives[a].connector).getLiqValue(
                    actives[a].actAddress,
                    addrWault,
                    actives[a].poolPrice
                );

                ap[a] = ActivesPrices(
                    actives[a].actAddress,
                    tokAct.name(),
                    tokAct.symbol(),
                    tokAct.decimals(),
                    price,
                    bookValue,
                    liqValue
                );
            }
        }

        return ap;
    }

    function tstPrice(uint256 _tst) public onlyOwner {
        ActivesPrices[] memory ap = activesPrices();

        testprice = _tst;
    }

    function assetPricesForBalance() external override returns (TotalAssetPrices memory) {
        return assetPricesForBalance(address(0), 0);
    }

    function assetPricesForBalance(address withdrawToken, uint256 withdrawAmount)
        public
        override
        returns (TotalAssetPrices memory)
    {
        InvestmentPortfolio.AssetWeight[] memory assetWeights = investmentPortfolio
            .getAllAssetWeights();

        //TODO: remove
        log("assetWeights.length: ", assetWeights.length);

        uint256 totalUsdcPrice = 0;
        uint256 count = assetWeights.length;
        // limit iteration count. TODO: recheck
        if (count > 100) {
            count = 100;
        }
        AssetPrices[] memory assetPrices = new AssetPrices[](count);
        for (uint8 i = 0; i < count; i++) {
            InvestmentPortfolio.AssetWeight memory assetWeight = assetWeights[i];
            uint256 amountInVault = IERC20(assetWeight.asset).balanceOf(address(vault));
            uint256 usdcPriceOne = 1; //TODO: use real price

            InvestmentPortfolio.AssetInfo memory assetInfo = investmentPortfolio.getAssetInfo(
                assetWeight.asset
            );
            IPriceGetter priceGetter = IPriceGetter(assetInfo.priceGetter);

            uint256 usdcPrice = usdcPriceOne * 10**18;

            uint256 usdcPriceDenominator = priceGetter.denominator();
            uint256 usdcSellPrice = priceGetter.getUsdcSellPrice();
            uint256 usdcBuyPrice = priceGetter.getUsdcBuyPrice();

            //TODO: denominator usage
            uint256 denominator = 10**(IERC20Metadata(assetWeight.asset).decimals() - 6);
            // uint256 usdcPriceInVault = (amountInVault * usdcPriceOne) / denominator;
            uint256 usdcPriceInVault = (amountInVault * usdcPriceDenominator) /
                (usdcSellPrice * denominator);

            // amountInVault = 19500_000000
            // usdcSellPrice = 0.975 * 10^18
            // usdcPriceDenominator = 10^18

            // uint256 amounbtDenominator = 10**(IERC20Metadata(assetWeight.asset).decimals() - 6);
            // uint256 usdcPriceInVault2 = ;

            //TODO: remove
            log("amountInVault: ", amountInVault);

            totalUsdcPrice += usdcPriceInVault;

            assetPrices[i] = AssetPrices(
                assetWeight.asset,
                amountInVault,
                usdcPriceOne,
                usdcPriceInVault,
                0,
                0,
                usdcPriceDenominator,
                usdcSellPrice,
                usdcBuyPrice,
                (amountInVault * usdcPriceDenominator) / (usdcSellPrice * denominator)
            );

            log("usdcPriceInVault2: ", assetPrices[i].usdcPriceInVault2);
        }

        // 3. validate withdrawAmount
        require(
            totalUsdcPrice >= withdrawAmount,
            string(
                abi.encodePacked(
                    "Withdraw more than total: ",
                    uint2str(withdrawAmount),
                    " > ",
                    uint2str(totalUsdcPrice)
                )
            )
        );

        // 4. correct total with withdrawAmount
        totalUsdcPrice = totalUsdcPrice - withdrawAmount;

        for (uint8 i = 0; i < count; i++) {
            AssetPrices memory assetPrice = assetPrices[i];
            (assetPrice.diffToTarget, assetPrice.diffToTargetSign) = diffToTarget(
                totalUsdcPrice,
                assetPrice.asset
            );
            // update diff for withdrawn token
            if (withdrawAmount > 0 && assetPrice.asset == withdrawToken) {
                if (assetPrice.diffToTargetSign < 0) {
                    if (assetPrice.diffToTarget > withdrawAmount) {
                        assetPrice.diffToTarget = assetPrice.diffToTarget - withdrawAmount;
                    } else {
                        assetPrice.diffToTarget = withdrawAmount - assetPrice.diffToTarget;
                        assetPrice.diffToTargetSign = int8(1);
                    }
                } else {
                    assetPrice.diffToTarget = assetPrice.diffToTarget + withdrawAmount;
                }
            }
        }

        TotalAssetPrices memory totalPrices = TotalAssetPrices(assetPrices, totalUsdcPrice);

        return totalPrices;
    }

    function diffToTarget(uint256 totalUsdcPrice, address asset)
        internal
        view
        returns (uint256, int8)
    {
        InvestmentPortfolio.AssetWeight memory assetWeight = investmentPortfolio.getAssetWeight(
            asset
        );
        uint256 targetAmount = (totalUsdcPrice * assetWeight.targetWeight) /
            investmentPortfolio.TOTAL_WEIGHT();
        uint256 currentAmount = IERC20(asset).balanceOf(address(vault));
        //TODO: denominator usage
        uint256 denominator = 10**(IERC20Metadata(asset).decimals() - 6);
        currentAmount = currentAmount / denominator;

        if (targetAmount >= currentAmount) {
            return (targetAmount - currentAmount, int8(1));
        } else {
            return (currentAmount - targetAmount, int8(-1));
        }
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
        emit ConsoleLog(string(abi.encodePacked(message, uint2str(value))));
    }
}

/* // function m2m () {

    // calculate proportions and changes value
        for (uint8 a = 0; a<actives.length; a++) {
                totalSum +=  (uint128 (actives[a].balance)) * priceAct;


        }

    }
 */
