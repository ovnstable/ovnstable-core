const {ethers} = require("hardhat");

let {DEFAULT} = require('@overnight-contracts/common/utils/assets');

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    let mockPL = await deploy("MockPayoutListener", {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: false
    });

};

module.exports.tags = ['MockPayoutListener'];

