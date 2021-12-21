const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();


    const connectorBalancer = await ethers.getContract("ConnectorBalancer");

    let exchange = await deploy('Usdc2BpspTUsdTokenExchange', {
        from: deployer,
        args: [connectorBalancer.address, assets.usdc, assets.bpspTUsd],
        log: true,
    });

    await deploy('Usdc2BpspTUsdActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.bpspTUsd],
        log: true,
    });
};

module.exports.tags = ['base', 'Usdc2BpspTUsdActionBuilder', 'Usdc2BpspTUsdTokenExchange'];
