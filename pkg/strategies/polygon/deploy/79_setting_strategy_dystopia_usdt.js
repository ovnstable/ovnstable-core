const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
let dystPair = '0x4570da74232c1A784E77c2a260F85cdDA8e7d47B'; //sAMM-USDC/USDT
let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyDystopiaUsdt");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, dystToken, POLYGON.wMatic)).wait();
    await (await strategy.setParams(gauge, dystPair, dystRouter, POLYGON.balancerVault, POLYGON.balancerPoolIdUsdcTusdDaiUsdt)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyDystopiaUsdt setting done');
};

module.exports.tags = ['setting', 'StrategyDystopiaUsdtSetting'];
