const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyBalancer");
    const vault = await ethers.getContract("Vault");
    await (await strategy.setParams(vault.address, assets.usdc, assets.idleUsdc, assets.wMatic)).wait();
    console.log('StrategyBalancer setting done');

    await (await vault.setPortfolioManager((await ethers.getContract("StrategyBalancer")).address)).wait();
    console.log("vault.setPortfolioManager done");

};

module.exports.tags = ['setting', 'StrategyBalancerSetting'];

