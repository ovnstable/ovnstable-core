const { ethers, upgrades} = require("hardhat");
const { deployProxy } = require('@overnight-contracts/common/utils/deployProxy');
const {isZkSync} = require("@overnight-contracts/common/utils/network");
const {Deployer} = require("@matterlabs/hardhat-zksync-deploy");
const hre = require("hardhat");
const {initWallet} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts();

    // await deployProxy('OvnTimelockController', deployments, save);
    // console.log("Deploy OvnTimelockController done");

    const token = await ethers.getContract("OvnToken");
    const controller = await ethers.getContract("OvnTimelockController");


    if (isZkSync()){

        const deployerZkSync = new Deployer(hre, await initWallet());

        let ovnGovernorArtifact = await deployerZkSync.loadArtifact('OvnGovernor');
        const governor = await deployerZkSync.deploy(ovnGovernorArtifact, [token.address, controller.address ]);

        await save('OvnGovernor', {
            address: governor.address,
            ...ovnGovernorArtifact
        });
        console.log("Deploy OvnGovernor done");

    }else {
        await deploy('OvnGovernor', {
            from: deployer,
            args: [token.address, controller.address ],
            log: true,
        });
        console.log("Deploy OvnGovernor done");
    }


    let governor = await ethers.getContract('OvnGovernor');

    await (await controller.setGovernor(governor.address)).wait();
    console.log('Grant proposer role to governor - done');

};

module.exports.tags = ['governance','OvnGovernor'];
