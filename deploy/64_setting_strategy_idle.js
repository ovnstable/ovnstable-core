const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const quickswapExchange = await ethers.getContract("QuickswapExchange");

    const strategy = await ethers.getContract("StrategyIdle");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setParams(assets.usdc, assets.idleUsdc, assets.wMatic, quickswapExchange.address)).wait();

    await (await strategy.setPortfolioManager(pm.address)).wait();
    console.log('StrategyIdle setting done');
};

module.exports.tags = ['setting', 'StrategyIdleSetting'];
module.exports.dependencies = ["PortfolioManager"];
