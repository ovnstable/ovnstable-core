const { ethers, upgrades} = require("hardhat");
const { deployProxy } = require("../utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    await deployProxy('PolygonStrategyQsMaiUsdt', deployments, save);
};

module.exports.tags = ['base', 'PolygonStrategyQsMaiUsdt'];
