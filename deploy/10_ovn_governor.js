const { ethers, upgrades} = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('TimelockController', {
        from: deployer,
        args: [0, [], []],
        log: true,
    });
    console.log("Deploy TimelockController done");

    const token = await ethers.getContract("OvnToken");
    const controller = await ethers.getContract("TimelockController");

    await deploy('OvnGovernor', {
        from: deployer,
        args: [token.address, controller.address ],
        log: true,
    });
    console.log("Deploy OvnGovernor done");

    let governor = await ethers.getContract('OvnGovernor');

    let role = await controller.PROPOSER_ROLE();
    await controller.grantRole(role, governor.address)
    console.log('Grant proposer role to governor - done');

    role = await  controller.EXECUTOR_ROLE();
    await controller.grantRole(role, governor.address)
    console.log('Grant executor role to governor - done');
};

module.exports.tags = ['governance','OvnGovernor'];
