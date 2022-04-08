const { ethers } = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";
let balancerPoolId1 = "0x614b5038611729ed49e0ded154d8a5d3af9d1d9e00010000000000000000001d";
let balancerPoolId2 = "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002";

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyMStable");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.mUsd, POLYGON.imUsd, POLYGON.vimUsd, POLYGON.mta, POLYGON.wMatic)).wait();
    await (await strategy.setParams(balancerVault, uniswapRouter, balancerPoolId1, balancerPoolId2)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyMStable setting done');
};

module.exports.tags = ['setting', 'StrategyMStableSetting'];

