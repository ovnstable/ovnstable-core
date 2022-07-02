const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let nUsdLPToken = '0x7479e1Bc2F2473f9e78c89B4210eb6d55d33b645';
let synToken = '0xf8F9efC0db77d8881500bb06FF5D6ABc3070E695';
let swap = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';
let miniChefV2 = '0x7875Af1a6878bdA1C129a4e2356A3fD040418Be5';
let sushiSwapRouter = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';
let pid = 1;

module.exports = async () => {
    const strategy = await ethers.getContract("StrategySynapseUsdc");

    await (await strategy.setTokens(POLYGON.usdc, nUsdLPToken, synToken)).wait();
    await (await strategy.setParams(swap, miniChefV2, sushiSwapRouter, pid)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategySynapseUsdc setting done');
};

module.exports.tags = ['setting', 'StrategySynapseUsdcSetting'];
