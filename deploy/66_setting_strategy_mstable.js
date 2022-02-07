const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let quickswapExchange = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyMStable");
    const vault = await ethers.getContract("Vault");
    await (await strategy.setParams(vault.address, assets.usdc, assets.mUsd, assets.imUsd, assets.vimUsd, assets.mta,
    assets.wMatic, balancerExchange, quickswapExchange, balancerPoolId1, balancerPoolId2)).wait();
    console.log('StrategyMStable setting done');

    await (await vault.setPortfolioManager((await ethers.getContract("StrategyMStable")).address)).wait();
    console.log("vault.setPortfolioManager done");

};

module.exports.tags = ['setting', 'StrategyMStableSetting'];

