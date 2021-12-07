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
        args: [10, [], []],
        log: true,
        proxy: {
            owner: deployer
        },
    });


    const token = await ethers.getContract("GovToken");
    const controller = await ethers.getContract("TimelockController");


    await deploy('OvnGovernorBravo', {
        from: deployer,
        args: [],
        log: true,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            owner: deployer,
            args: [token.address, controller.address ]
        },
    });


    let governor = await ethers.getContract('OvnGovernorBravo');

    let role = await controller.PROPOSER_ROLE();
    console.log('PROPOSER_ROLE: ' + role)
    await controller.grantRole(role, governor.address)
    console.log('Grant proposer role to governor - done');


    role = await  controller.EXECUTOR_ROLE();
    console.log('EXECUTOR_ROLE: ' + role)
    await controller.grantRole(role, governor.address)
    console.log('Grant executor role to governor - done');

};

module.exports.tags = ['base','Governance'];
