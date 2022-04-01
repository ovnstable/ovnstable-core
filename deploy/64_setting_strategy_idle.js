const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./polygon_assets.json'));

let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("PolygonStrategyIdle");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.idleUsdc, assets.wMatic)).wait();
    await (await strategy.setParams(uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('PolygonStrategyIdle setting done');
};

module.exports.tags = ['setting', 'PolygonStrategyIdleSetting'];
