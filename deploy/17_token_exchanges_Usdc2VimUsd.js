const fs = require('fs');
let assets = JSON.parse(fs.readFileSync('./assets.json'));

const { ethers } = require("hardhat");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const connectorMStable = await ethers.getContract("ConnectorMStable");
    const portfolio = await ethers.getContract('Portfolio');
    const pm = await ethers.getContract('PortfolioManager');
    const vault = await ethers.getContract("Vault");

     await deploy('Usdc2VimUsdTokenExchange', {
        from: deployer,
        args: [connectorMStable.address, assets.usdc, assets.vimUsd, vault.address],
        log: true,
    });
    console.log("Deploy Usdc2VimUsdTokenExchange done");

    const exchange = await ethers.getContract("Usdc2VimUsdTokenExchange");

    let tx = await exchange.grantRole(await exchange.PORTFOLIO_MANAGER(), pm.address);
    await tx.wait();
    console.log("Usdc2VimUsdTokenExchange.grantRole(PORTFOLIO_MANAGER) done");

    await deploy('Usdc2VimUsdActionBuilder', {
        from: deployer,
        args: [exchange.address, assets.usdc, assets.vimUsd, portfolio.address],
        log: true,
    });
    console.log("Deploy Usdc2VimUsdActionBuilder done");
};

module.exports.tags = ['base', 'token-exchanger',  'Usdc2VimUsdTokenExchange'];
