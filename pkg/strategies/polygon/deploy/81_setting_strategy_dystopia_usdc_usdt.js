const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let dystToken = '0x39aB6574c289c3Ae4d88500eEc792AB5B947A5Eb';
let dystPair = '0x4570da74232c1A784E77c2a260F85cdDA8e7d47B'; //sAMM-USDC/USDT
let dystRouter = '0xbE75Dd16D029c6B32B7aD57A0FD9C1c20Dd2862e'; //DystRouter01
let gauge = '0x7c9716266795a04ae1fbbd017dc2585fbf78076d'; //aka MasterChef
let penToken = '0x9008D70A5282a936552593f410AbcBcE2F891A97';
let userProxy = '0xc9Ae7Dac956f82074437C6D40f67D6a5ABf3E34b';
let penLens = '0x1432c3553FDf7FBD593a84B3A4d380c643cbf7a2';
let swapper = '0xf69f73Cac304A0433Ba414819E3e024Fd1Ce4fC8';
let synapseSwap = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyDystopiaUsdcUsdt");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, dystToken, POLYGON.wMatic, penToken)).wait();
    await (await strategy.setParams(
        gauge,
        dystPair,
        dystRouter,
        POLYGON.balancerVault,
        POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.oracleChainlinkUsdc,
        POLYGON.oracleChainlinkUsdt,
        userProxy,
        penLens,
        synapseSwap
    )).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyDystopiaUsdcUsdt setting done');
};

module.exports.tags = ['setting', 'StrategyDystopiaUsdcUsdtSetting'];
