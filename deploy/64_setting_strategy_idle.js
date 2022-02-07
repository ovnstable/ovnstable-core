const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyIdle");
    const vault = await ethers.getContract("Vault");
    await (await strategy.setParams(assets.idleUsdc, assets.usdc, vault.address)).wait();
    console.log('StrategyIdle setting done');

    await (await vault.setPortfolioManager((await ethers.getContract("StrategyIdle")).address)).wait();
    console.log("vault.setPortfolioManager done");

};

module.exports.tags = ['setting','StrategyIdleSetting'];

