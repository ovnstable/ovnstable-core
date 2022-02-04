const {ethers} = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const portfolio = await ethers.getContract("Portfolio");



    let aave = {
        strategy: (await ethers.getContract("StrategyAave")).address,
        minWeight: 0,
        targetWeight: 35000,
        maxWeight: 100000,
    }
    let curve = {
        strategy: (await ethers.getContract("StrategyCurve")).address,
        minWeight: 0,
        targetWeight: 20000,
        maxWeight: 100000,
    }
    let idle = {
        strategy: (await ethers.getContract("StrategyIdle")).address,
        minWeight: 0,
        targetWeight: 35000,
        maxWeight: 100000,
    }

    let weights = [
        aave,
        curve,
        idle
    ]

    console.log('portfolio.setWeights: ' + JSON.stringify(weights))
    let tx = await portfolio.setStrategyWeights(weights);
    await tx.wait();
    console.log("portfolio.setWeights done");
};

module.exports.tags = ['setting', 'setting-weights'];

