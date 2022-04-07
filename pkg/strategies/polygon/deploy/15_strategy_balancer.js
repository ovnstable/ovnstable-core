const { ethers, upgrades} = require("hardhat");
const { deployProxy } = require("../../common/utils/deployProxy");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    await deployProxy('PolygonStrategyBalancer', deployments, save);
};

module.exports.tags = ['base', 'PolygonStrategyBalancer'];
