const { ethers } = require("hardhat");

const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connectorAAVE = await ethers.getContract("ConnectorAAVE");
    const usdc2VimUsdActionBuilder = await ethers.getContract("Usdc2VimUsdActionBuilder");
    const usdc2IdleUsdcActionBuilder = await ethers.getContract("Usdc2IdleUsdcActionBuilder");
    const portfolio = await ethers.getContract('Portfolio');

    let exchange = await deploy('Usdc2AUsdcTokenExchange', {
        from: deployer,
        args: [connectorAAVE.address, assets.usdc, assets.amUsdc],
        log: true,
    });

    await deploy('Usdc2AUsdcActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.amUsdc, assets.vimUsd, assets.idleUsdc, usdc2VimUsdActionBuilder.address, usdc2IdleUsdcActionBuilder.address, portfolio.address],
        log: true,
    });
};

module.exports.tags = ['base','Usdc2AUsdcActionBuilder', 'Usdc2AUsdcTokenExchange'];
module.exports.dependencies = ['Usdc2IdleUsdcActionBuilder', 'Usdc2VimUsdActionBuilder'];