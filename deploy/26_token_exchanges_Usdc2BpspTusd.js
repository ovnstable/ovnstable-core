const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    const connectorBalancer = await ethers.getContract("ConnectorBalancer");

    let exchange = await deploy('Usdc2BpspTusdTokenExchange', {
        from: deployer,
        args: [connectorBalancer.address, assets.usdc, assets.bpspTusd],
        log: true,
    });

    await deploy('Usdc2BpspTusdActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.bpspTusd],
        log: true,
    });
};

module.exports.tags = ['base', 'Usdc2BpspTusdActionBuilder', 'Usdc2BpspTusdTokenExchange'];
