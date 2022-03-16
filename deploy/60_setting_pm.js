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
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }
    // let curve = {
    //     strategy: (await ethers.getContract("StrategyCurve")).address,
    //     minWeight: 0,
    //     targetWeight: 0,
    //     maxWeight: 100000,
    //     enabled: true,
    //     enabledReward: true,
    // }

    let mstable= {
        strategy: (await ethers.getContract("StrategyMStable")).address,
        minWeight: 0,
        targetWeight: 30000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let izumu = {
        strategy: (await ethers.getContract("StrategyIzumi")).address,
        minWeight: 0,
        targetWeight: 55000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let impermaxQsUsdt = {
        strategy: (await ethers.getContract("StrategyImpermaxQsUsdcUsdt")).address,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let dodoUsdc = {
        strategy: (await ethers.getContract("StrategyDodoUsdc")).address,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    // let balancer = {
    //     strategy: (await ethers.getContract("StrategyBalancer")).address,
    //     minWeight: 0,
    //     targetWeight: 0,
    //     maxWeight: 100000,
    //     enabled: true,
    //     enabledReward: true,
    // }

    // let idle = {
    //     strategy: (await ethers.getContract("StrategyIdle")).address,
    //     minWeight: 0,
    //     targetWeight: 0,
    //     maxWeight: 100000,
    //     enabled: true,
    //     enabledReward: true,
    // }

    let weights = [
        aave,
        mstable,
        izumu,
        impermaxQsUsdt,
        dodoUsdc,
        // balancer,
        // curve,
        // idle
    ]

    await (await pm.setStrategyWeights(weights)).wait();
    console.log("portfolio.setWeights done");

    await (await pm.setExchanger(exchange.address)).wait();
    await (await pm.setUsdc(assets.usdc)).wait();
    await (await pm.setCashStrategy((await ethers.getContract("StrategyAave")).address)).wait();
};

module.exports.tags = ['setting', 'SettingPM'];

