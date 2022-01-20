const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connectorIDLE = await ethers.getContract("ConnectorIDLE");
    const portfolio = await ethers.getContract('Portfolio');

    let exchange = await deploy('Usdc2IdleUsdcTokenExchange', {
        from: deployer,
        args: [connectorIDLE.address, assets.usdc, assets.idleUsdc],
        log: true,
    });

    await deploy('Usdc2IdleUsdcActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.idleUsdc, portfolio.address],
        log: true,
    });
};

module.exports.tags = ['base', 'Usdc2IdleUsdcActionBuilder', 'Usdc2IdleUsdcTokenExchange'];
