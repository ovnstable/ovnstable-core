const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategySpookySwapMaiUsdc");

    await (await strategy.setTokens(FANTOM.mai, FANTOM.usdc, FANTOM.boo)).wait();
    await (await strategy.setParams(FANTOM.spookySwapRouter, FANTOM.spookySwapLPMaiUsdc, FANTOM.spookySwapMasterChef,
        FANTOM.pidSpookySwapMaiUsdc, FANTOM.beethovenxVault, FANTOM.poolIdMaiUsdc, FANTOM.poolIdBooUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategySpookySwapMaiUsdc setting done');
};

module.exports.tags = ['setting', 'StrategySpookySwapMaiUsdcSetting'];

