const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('GovToken', {
        from: deployer,
        args: [],
        log: true,
    });

    await deploy('TimelockController', {
        from: deployer,
        args: [0, [], []],
        log: true,
    });


    const token = await ethers.getContract("GovToken");
    const controller = await ethers.getContract("TimelockController");


    await deploy('OvnGovernor', {
        from: deployer,
        args: [token.address, controller.address ],
        log: true,
    });


    let governor = await ethers.getContract('OvnGovernor');

    let role = await controller.PROPOSER_ROLE();
    await controller.grantRole(role, governor.address)
    console.log('Grant proposer role to governor - done');


    role = await  controller.EXECUTOR_ROLE();
    await controller.grantRole(role, governor.address)
    console.log('Grant executor role to governor - done');

};

module.exports.tags = ['base','Governance'];
