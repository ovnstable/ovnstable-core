const {ethers} = require("hardhat");

const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {core} = require('@overnight-contracts/common/utils/core');

let stgToken = '0x2F6F07CDcf3588944Bf4C42aC74ff24bF56e7590';
let stargateRouter = '0x45A01E4e04F14f7A4a6702c74187c5F6222033cd';
let pool = '0x29e38769f23701A2e4A8Ef0492e19dA4604Be62c';
let lpStaking = '0x8731d54E9D02c286767d56ac03e8037C07e01e98';
let pid = 1;
let sushiSwapRouter = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';
let synapseSwap = '0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (hre.ovn === undefined || !hre.ovn.noDeploy) {
        await deployProxy('StrategyStargateUsdt', deployments, save);
    }

    if (hre.ovn === undefined || hre.ovn.setting) {
        const strategy = await ethers.getContract("StrategyStargateUsdt");

        await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, stgToken)).wait();
        await (await strategy.setParams(stargateRouter, pool, lpStaking, pid, sushiSwapRouter, synapseSwap,
            POLYGON.oracleChainlinkUsdc, POLYGON.oracleChainlinkUsdt,)).wait();
        await (await strategy.setPortfolioManager(core.pm)).wait();

        console.log('StrategyStargateUsdt setting done');
    }
};

module.exports.tags = ['base', 'StrategyStargateUsdt'];