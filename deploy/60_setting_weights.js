const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const portfolio = await ethers.getContract("Portfolio");

    let idleUsdcWeight = {
        asset: assets.idleUsdc,
        minWeight: 0,
        targetWeight: 2000,
        maxWeight: 100000,
    }
    let usdcWeight = {
        asset: assets.usdc,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
    }
    let aUsdcWeight = {
        asset: assets.amUsdc,
        minWeight: 0,
        targetWeight: 8000,
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
        idleUsdcWeight,
        usdcWeight,
        aUsdcWeight,
        a3CrvWeight,
        a3CrvGaugeWeight,
        wMaticWeight,
        crvWeight
    ]
    let result = await portfolio.setWeights(weights);
    console.log("portfolio.setWeights done");

};

module.exports.tags = ['setting','Setting'];

