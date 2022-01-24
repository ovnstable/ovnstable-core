const { ethers } = require("hardhat");

const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connectorCurve = await ethers.getContract("ConnectorCurve");
    const usdc2AUsdcActionBuilder = await ethers.getContract("Usdc2AUsdcActionBuilder");
    const a3Crv2A3CrvGaugeActionBuilder = await ethers.getContract("A3Crv2A3CrvGaugeActionBuilder");
    const portfolio = await ethers.getContract('Portfolio');

    let exchange = await deploy('AUsdc2A3CrvTokenExchange', {
        from: deployer,
        args: [connectorCurve.address, assets.amUsdc, assets.am3CRV, portfolio.address],
        log: true,
    });

    await deploy('AUsdc2A3CrvActionBuilder', {
        from: deployer,
        args: [exchange.address,assets.amUsdc, assets.am3CRV, usdc2AUsdcActionBuilder.address, a3Crv2A3CrvGaugeActionBuilder.address],
        log: true,
    });
};

module.exports.tags = ['base', 'token-exchanger', 'AUsdc2A3CrvTokenExchange'];
