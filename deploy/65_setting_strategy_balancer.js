const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";
let balancerPoolId1 = "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068";
let balancerPoolId2 = "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002";
let merkleOrchard = "0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e";
let distributorBal = "0xd2EB7Bd802A7CA68d9AcD209bEc4E664A9abDD7b";
let distributorWMatic = "0x632208491602Dd205da8Cb9C0BA98620fc19854A";
let distributorTUsd = "0xc38c5f97B34E175FFd35407fc91a937300E33860";
let distributionId = 137;

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyBalancer");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.bpspTUsd, assets.bal, assets.wMatic, assets.tUsd)).wait();
    await (await strategy.setParams(balancerVault, uniswapRouter, balancerPoolId1, balancerPoolId2,
            merkleOrchard, distributorBal, distributorWMatic, distributorTUsd, distributionId)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('StrategyBalancer setting done');
};

module.exports.tags = ['setting', 'StrategyBalancerSetting'];

