const UsdcPriceGetter = artifacts.require("./price_getters/UsdcPriceGetter");
const AUsdcPriceGetter = artifacts.require("./price_getters/AUsdcPriceGetter");
const A3CrvPriceGetter = artifacts.require("./price_getters/A3CrvPriceGetter");

const InvestmentPortfolio = artifacts.require("./regetries/InvestmentPortfolio.sol")


module.exports = async function (deployer) {
    
    await deployer.deploy(UsdcPriceGetter);
    await deployer.deploy(AUsdcPriceGetter);
    await deployer.deploy(A3CrvPriceGetter);

    const usdcPriceGetter = await UsdcPriceGetter.deployed();
    const aUsdcPriceGetter = await AUsdcPriceGetter.deployed();
    const a3CrvPriceGetter = await A3CrvPriceGetter.deployed();

    // setup price getters
    let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351"
    await a3CrvPriceGetter.setPool(aCurvepoolStake);

    // link 
    const investmentPortfolio = await InvestmentPortfolio.deployed();

    let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
    let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
    let a3Crv = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"


    // struct AssetInfo {
    //     address asset;
    //     address priceGetter;
    // }


    let usdcAssetInfo = {
        asset: usdc,
        priceGetter: usdcPriceGetter.address
    }
    let aUsdcAssetInfo = {
        asset: aUsdc,
        priceGetter: aUsdcPriceGetter.address
    }
    let a3CrvAssetInfo = {
        asset: a3Crv,
        priceGetter: a3CrvPriceGetter.address
    }
    let assetInfos = [
        usdcAssetInfo,
        aUsdcAssetInfo,
        a3CrvAssetInfo
    ]
    let result = await investmentPortfolio.setAssetInfos(assetInfos);
    console.log("assetInfos: " + result);


};
