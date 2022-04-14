const {ethers} = require("hardhat");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const pm = await ethers.getContract("PortfolioManager");
    const exchange = await ethers.getContract("Exchange");



    let mockStrategy1 = await deploy("MockStrategy", {
        from: deployer,
        args: [DEFAULT.usdc, 1],
        log: true,
        skipIfAlreadyDeployed: false
    });
    let mockStrategy2 = await deploy("MockStrategy", {
        from: deployer,
        args: [DEFAULT.usdc, 2],
        log: true,
        skipIfAlreadyDeployed: false
    });

    let strategy1 = {
        strategy: mockStrategy1.address,
        minWeight: 0,
        targetWeight: 50000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }

    let strategy2 = {
        strategy: mockStrategy2.address,
        minWeight: 0,
        targetWeight: 50000,
        maxWeight: 100000,
        enabled: true,
        enabledReward: true,
    }


    let weights = [
        strategy1,
        strategy2,
    ]

    await (await pm.setStrategyWeights(weights)).wait();
    console.log("portfolio.setWeights done");

    await (await pm.setCashStrategy(mockStrategy1.address)).wait();
};

module.exports.tags = ['MockStrategies'];

