const {ethers} = require("hardhat");

let {DEFAULT} = require('../../common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const pm = await ethers.getContract("PortfolioManager");
    const exchange = await ethers.getContract("Exchange");




    let aave = {
        strategy: (await ethers.getContract("MochStrategy")).address,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }
    // let curve = {
    //     strategy: (await ethers.getContract("PolygonStrategyCurve")).address,
    //     minWeight: 0,
    //     targetWeight: 0,
    //     maxWeight: 100000,
    //     enabled: true,
    //     enabledReward: true,
    // }

    let mstable= {
        strategy: (await ethers.getContract("PolygonStrategyMStable")).address,
        minWeight: 0,
        targetWeight: 30000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let izumu = {
        strategy: (await ethers.getContract("PolygonStrategyIzumi")).address,
        minWeight: 0,
        targetWeight: 50000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let impermaxQsUsdt = {
        strategy: (await ethers.getContract("PolygonStrategyImpermaxQsUsdcUsdt")).address,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let dodoUsdc = {
        strategy: (await ethers.getContract("PolygonStrategyDodoUsdc")).address,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let dodoUsdt = {
        strategy: (await ethers.getContract("PolygonStrategyDodoUsdt")).address,
        minWeight: 0,
        targetWeight: 5000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    // let balancer = {
    //     strategy: (await ethers.getContract("PolygonStrategyBalancer")).address,
    //     minWeight: 0,
    //     targetWeight: 0,
    //     maxWeight: 100000,
    //     enabled: true,
    //     enabledReward: true,
    // }

    // let idle = {
    //     strategy: (await ethers.getContract("PolygonStrategyIdle")).address,
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
        dodoUsdt,
        // balancer,
        // curve,
        // idle
    ]

    await (await pm.setStrategyWeights(weights)).wait();
    console.log("portfolio.setWeights done");

    await (await pm.setExchanger(exchange.address)).wait();
    await (await pm.setUsdc(DEFAULT.usdc)).wait();
    await (await pm.setCashStrategy((await ethers.getContract("PolygonStrategyAave")).address)).wait();
};

module.exports.tags = ['setting', 'SettingPM'];

