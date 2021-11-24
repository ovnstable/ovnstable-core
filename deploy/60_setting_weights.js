const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const investmentPortfolio = await ethers.getContract("InvestmentPortfolio");

    let usdcWeight = {
        asset: assets.usdc,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
    }
    let aUsdcWeight = {
        asset: assets.amUsdc,
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
    }
    let a3CrvWeight = {
        asset: assets.am3CRV,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
    }
    let a3CrvGaugeWeight = {
        asset: assets.am3CRVgauge,
        minWeight: 0,
        targetWeight: 80000,
        maxWeight: 100000,
    }
    let wMaticWeight = {
        asset: assets.wMatic,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let crvWeight = {
        asset: assets.crv,
        minWeight: 0,
        targetWeight: 0,
        maxWeight: 100000,
    }
    let weights = [
        usdcWeight,
        aUsdcWeight,
        a3CrvWeight,
        a3CrvGaugeWeight,
        wMaticWeight,
        crvWeight
    ]
    let result = await investmentPortfolio.setWeights(weights);
    console.log("investmentPortfolio.setWeights done");

};

module.exports.tags = ['base','Setting'];

