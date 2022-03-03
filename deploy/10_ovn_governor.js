const { ethers, upgrades} = require("hardhat");
const deployProxy = require('../utils/deployProxy');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    await deployProxy('OvnTimelockController', deployments, save);
    console.log("Deploy OvnTimelockController done");

    const token = await ethers.getContract("OvnToken");
    const controller = await ethers.getContract("OvnTimelockController");

    await deploy('OvnGovernor', {
        from: deployer,
        args: [token.address, controller.address ],
        log: true,
    });
    console.log("Deploy OvnGovernor done");

    let governor = await ethers.getContract('OvnGovernor');

    await controller.setGovernor(governor.address)
    console.log('Grant proposer role to governor - done');

};

module.exports.tags = ['governance','OvnGovernor'];
