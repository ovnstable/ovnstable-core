const { ethers } = require("hardhat");
const fs = require('fs');

let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const exchange = await ethers.getContract("Exchange");
    const vault = await ethers.getContract("Vault");
    const balancer = await ethers.getContract("StrategyBalancer");
    const pm = await ethers.getContract("PortfolioManager");

    console.log('pm.setVault: ' + vault.address)
    await (await pm.setVault(vault.address)).wait();
    console.log("pm.setVault done");

    await (await pm.setBalancer(balancer.address)).wait();
    console.log("pm.setBalancer done");

    await (await pm.setExchanger(exchange.address)).wait();
    console.log("pm.setExchanger done");



};

module.exports.tags = ['setting','Setting'];
