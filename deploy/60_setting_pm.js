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
        targetWeight: 10000,
        maxWeight: 100000,
    }
    let curve = {
        strategy: (await ethers.getContract("StrategyCurve")).address,
        minWeight: 0,
        targetWeight: 45000,
        maxWeight: 100000,
    }

    let mstable= {
        strategy: (await ethers.getContract("StrategyMStable")).address,
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
    }

    let balancer = {
        strategy: (await ethers.getContract("StrategyBalancer")).address,
        minWeight: 0,
        targetWeight: 10000,
        maxWeight: 100000,
    }

    let idle = {
        strategy: (await ethers.getContract("StrategyIdle")).address,
        minWeight: 0,
        targetWeight: 25000,
        maxWeight: 100000,
    }

    let weights = [
        aave,
        mstable,
        balancer,
        curve,
        idle
    ]

    await (await pm.setStrategyWeights(weights)).wait();
    console.log("portfolio.setWeights done");

    await (await pm.setExchanger(exchange.address)).wait();
    await (await pm.setUsdc(assets.usdc)).wait();
};

module.exports.tags = ['setting', 'SettingPM'];

