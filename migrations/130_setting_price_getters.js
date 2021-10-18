const InvestmentPortfolio = artifacts.require("./regetries/InvestmentPortfolio.sol")

const UsdcPriceGetter = artifacts.require("./price_getters/UsdcPriceGetter");
const AUsdcPriceGetter = artifacts.require("./price_getters/AUsdcPriceGetter");
const A3CrvPriceGetter = artifacts.require("./price_getters/A3CrvPriceGetter");
const A3CrvGaugePriceGetter = artifacts.require("./price_getters/A3CrvGaugePriceGetter");
const CrvPriceGetter = artifacts.require("./price_getters/CrvPriceGetter");
const WMaticPriceGetter = artifacts.require("./price_getters/WMaticPriceGetter");



let usdc = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
let aUsdc = "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F"
let a3Crv = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171"
let a3CrvGauge = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
let crv = "0x172370d5Cd63279eFa6d502DAB29171933a610AF"
let wMatic = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"

let swapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff"
let curveGaugeAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c"
let aCurvepoolStake = "0x445FE580eF8d70FF569aB36e80c647af338db351"


module.exports = async function (deployer) {

    const usdcPriceGetter = await UsdcPriceGetter.deployed();
    const aUsdcPriceGetter = await AUsdcPriceGetter.deployed();
    const a3CrvPriceGetter = await A3CrvPriceGetter.deployed();
    const a3CrvGaugePriceGetter = await A3CrvGaugePriceGetter.deployed();
    const crvPriceGetter = await CrvPriceGetter.deployed();
    const wMaticPriceGetter = await WMaticPriceGetter.deployed();

    // setup price getters
    await a3CrvPriceGetter.setPool(aCurvepoolStake);
    console.log("a3CrvPriceGetter.setPool done");

    await a3CrvGaugePriceGetter.setA3CrvPriceGetter(a3CrvPriceGetter.address);
    console.log("a3CrvGaugePriceGetter.setA3CrvPriceGetter done");

    // link 
    const investmentPortfolio = await InvestmentPortfolio.deployed();


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
    let a3CrvGaugeAssetInfo = {
        asset: a3CrvGauge,
        priceGetter: a3CrvGaugePriceGetter.address
    }
    let crvAssetInfo = {
        asset: crv,
        priceGetter: crvPriceGetter.address
    }
    let wMaticAssetInfo = {
        asset: wMatic,
        priceGetter: wMaticPriceGetter.address
    }
    let assetInfos = [
        usdcAssetInfo,
        aUsdcAssetInfo,
        a3CrvAssetInfo,
        a3CrvGaugeAssetInfo,
        crvAssetInfo,
        wMaticAssetInfo
    ]
    let result = await investmentPortfolio.setAssetInfos(assetInfos);
    console.log("investmentPortfolio.setAssetInfos done");

};
