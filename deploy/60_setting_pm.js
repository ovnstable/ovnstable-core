const {ethers} = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const pm = await ethers.getContract("PortfolioManager");
    const exchange = await ethers.getContract("Exchange");

    let aave = {
        strategy: (await ethers.getContract("StrategyAave")).address,
        minWeight: 0,
        targetWeight: 50000,
        maxWeight: 100000,
    }
    // let curve = {
    //     strategy: (await ethers.getContract("StrategyCurve")).address,
    //     minWeight: 0,
    //     targetWeight: 20000,
    //     maxWeight: 100000,
    // }

    let idle = {
        strategy: (await ethers.getContract("StrategyIdle")).address,
        minWeight: 0,
        targetWeight: 50000,
        maxWeight: 100000,
    }

    let weights = [
        aave,
        idle
    ]

    await (await pm.setStrategyWeights(weights)).wait();
    console.log("portfolio.setWeights done");

    await (await pm.setExchanger(exchange.address)).wait();
    await (await pm.setUsdc(assets.usdc)).wait();
};

module.exports.tags = ['setting', 'setting-weights'];

