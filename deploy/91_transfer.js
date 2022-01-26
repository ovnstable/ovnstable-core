const {ethers} = require("hardhat");

const fs = require("fs");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy('TransferAssets', {
        from: deployer,
        args: [],
        log: true,
    });

};

module.exports.tags = ['TransferAssets'];


