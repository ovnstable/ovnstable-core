const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connectorBalancer = await ethers.getContract("ConnectorBalancer");
    const portfolio = await ethers.getContract('Portfolio');

    let exchange = await deploy('Usdc2BpspTUsdTokenExchange', {
        from: deployer,
        args: [connectorBalancer.address, assets.usdc, assets.bpspTUsd],
        log: true,
    });
    console.log("Deploy Usdc2BpspTUsdTokenExchange done");

    await deploy('Usdc2BpspTUsdActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.bpspTUsd, portfolio.address],
        log: true,
    });
    console.log("Deploy Usdc2BpspTUsdActionBuilder done");
};

module.exports.tags = ['base', 'token-exchanger', 'Usdc2BpspTUsdActionBuilder', 'Usdc2BpspTUsdTokenExchange'];
