const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));



let impermaxRouter = "0x7c79a1c2152665273ebd50e9e88d92a887a83ba0";
let imxBToken = "0xEaB52C4eFBbB54505EB3FC804A29Dcf263668965";
let balancerPoolId = "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068";
let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyImpermaxQsUsdt");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.usdt)).wait();
    await (await strategy.setParams(impermaxRouter, balancerVault, balancerPoolId, imxBToken)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('StrategyImpermaxQsUsdt setting done');
};

module.exports.tags = ['setting', 'StrategyImpermaxQsUsdtSetting'];

