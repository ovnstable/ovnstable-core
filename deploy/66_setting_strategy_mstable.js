const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let balancerPoolId1 = "0x614b5038611729ed49e0ded154d8a5d3af9d1d9e00010000000000000000001d";
let balancerPoolId2 = "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const balancerExchange = await ethers.getContract("BalancerExchange");
    const quickswapExchange = await ethers.getContract("QuickswapExchange");

    const strategy = await ethers.getContract("StrategyMStable");
    await (await strategy.setParams(assets.usdc, assets.mUsd, assets.imUsd, assets.vimUsd, assets.mta, assets.wMatic,
            balancerExchange, quickswapExchange, balancerPoolId1, balancerPoolId2)).wait();
    console.log('StrategyMStable setting done');
};

module.exports.tags = ['setting', 'StrategyMStableSetting'];

