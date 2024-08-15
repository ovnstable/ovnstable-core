const {ethers} = require("hardhat");

let {getAsset} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const pm = await ethers.getContract("PortfolioManager");
    const exchange = await ethers.getContract("Exchange");

    let asset = getAsset('usdc');

    let mockStrategy1 = await deploy("MockStrategy", {
        from: deployer,
        args: [asset, 1],
        log: true,
        skipIfAlreadyDeployed: false
    });

    let mockStrategy2 = await deploy("MockStrategy", {
        from: deployer,
        args: [asset, 2],
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

    await (await pm.grantRole(await pm.PORTFOLIO_AGENT_ROLE(), deployer)).wait();

    await pm.addStrategy(mockStrategy1.address);
    await pm.addStrategy(mockStrategy2.address);

    await (await pm.setStrategyWeights(weights)).wait();
    console.log("portfolio.setWeights done");

    await (await pm.setCashStrategy(mockStrategy1.address)).wait();
};

module.exports.tags = ['MockStrategies'];

