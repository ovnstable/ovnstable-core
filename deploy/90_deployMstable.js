const {ethers} = require("hardhat");

const fs = require("fs");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();



    let governator = await ethers.getContract('OvnGovernor');
    let reward = await ethers.getContract("RewardManager");


    const proposeTx = await governator.proposeExec(
        [reward.address],
        [0],
        [reward.interface.encodeFunctionData('upgradeTo', ["0xdF211EA6783eD3Dc4ccc78D6Ce00dD31b84EC86d"])],
        ethers.utils.id(new Date().toUTCString())
    )

    await proposeTx.wait();
    console.log('Propose ' + JSON.stringify(proposeTx))
};

module.exports.tags = ['deployMstable'];


