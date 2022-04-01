const { ethers, upgrades} = require("hardhat");
const { deployProxyMulti } = require("../utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    await deployProxyMulti('PolygonStrategyImpermaxQsUsdcUsdt', 'PolygonStrategyImpermaxQsUsdt', deployments, save);

    // Uncomment for individual deploy
    // await deployProxyMulti('PolygonStrategyImpermaxQsMaticUsdt', 'PolygonStrategyImpermaxQsUsdt', deployments, save);
    // await deployProxyMulti('PolygonStrategyImpermaxQsWethUsdt', 'PolygonStrategyImpermaxQsUsdt', deployments, save);
    // await deployProxyMulti(Polygon'StrategyImpermaxQsMaiUsdt', 'PolygonStrategyImpermaxQsUsdt', deployments, save);
};

module.exports.tags = ['base', 'PolygonStrategyImpermaxQsUsdt'];
