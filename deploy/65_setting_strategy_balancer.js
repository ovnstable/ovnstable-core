const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let balancerPoolId1 = "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068";
let balancerPoolId2 = "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const balancerExchange = await ethers.getContract("BalancerExchange");
    const quickswapExchange = await ethers.getContract("QuickswapExchange");

    const strategy = await ethers.getContract("StrategyBalancer");
    await (await strategy.setParams(balancerVault, assets.usdc, assets.bpspTUsd, assets.bal, assets.wMatic, assets.tUsd,
            balancerExchange, quickswapExchange, balancerPoolId1, balancerPoolId2)).wait();
    console.log('StrategyBalancer setting done');
};

module.exports.tags = ['setting', 'StrategyBalancerSetting'];

