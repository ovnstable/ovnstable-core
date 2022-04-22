const { ethers, upgrades} = require("hardhat");
const { deployProxy } = require('@overnight-contracts/common/utils/deployProxy');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    await deployProxy('PreOvnToken', deployments, save);
    console.log('Deploy PreOvnToken done');
};

module.exports.tags = ['PreOvnToken'];
