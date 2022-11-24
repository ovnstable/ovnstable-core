const {ethers} = require("hardhat");


module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const exchange = await ethers.getContract("Exchange");

    await deploy("ExchangeMultiCallWrapper", {
        from: deployer,
        args: [
            exchange.address
        ],
        log: true,
        skipIfAlreadyDeployed: false
    });
};

module.exports.tags = ['ExchangeMultiCallWrapper'];

