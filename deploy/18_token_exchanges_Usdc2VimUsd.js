const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connectorMStable = await ethers.getContract("ConnectorMStable");
    const portfolio = await ethers.getContract('Portfolio');
    const vault = await ethers.getContract("Vault");

    let exchange = await deploy('Usdc2VimUsdTokenExchange', {
        from: deployer,
        args: [connectorMStable.address, assets.usdc, assets.vimUsd, vault.address],
        log: true,
    });

    await deploy('Usdc2VimUsdActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.vimUsd, portfolio.address],
        log: true,
    });
};

module.exports.tags = ['base', 'Usdc2VimUsdActionBuilder', 'Usdc2VimUsdTokenExchange'];
