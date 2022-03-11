const { ethers, upgrades} = require("hardhat");
const { deployProxyMulti } = require("../utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    // await deployProxyMulti('StrategyImpermaxQsUsdcUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
    await deployProxyMulti('StrategyImpermaxQsMaticUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
    // await deployProxyMulti('StrategyImpermaxQsWethUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
    // await deployProxyMulti('StrategyImpermaxQsMaiUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
};

module.exports.tags = ['base', 'StrategyImpermaxQsUsdt'];
