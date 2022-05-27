const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
let dystPair = '0xFec23508fE4b5d10A3eb0D83b9947CAa56F39463'; //sAMM-USDC/DAI
let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let gauge = '0x9c3Afbc9D0540168C6D4f3dA0F48FeBA6a3A7d2a'; //aka MasterChef
let daiToken = '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063';

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyDystopiaDai");

    await (await strategy.setTokens(POLYGON.usdc, daiToken, dystToken, POLYGON.wMatic)).wait();
    await (await strategy.setParams(gauge, dystPair, dystRouter, POLYGON.balancerVault, POLYGON.balancerPoolIdUsdcTusdDaiUsdt)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyDystopiaDai setting done');
};

module.exports.tags = ['setting', 'StrategyDystopiaDaiSetting'];
