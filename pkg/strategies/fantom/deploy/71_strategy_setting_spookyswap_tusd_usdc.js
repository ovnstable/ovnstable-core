const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategySpookySwapTusdUsdc");

    await (await strategy.setTokens(FANTOM.tusd, FANTOM.usdc, FANTOM.boo)).wait();
    await (await strategy.setParams(FANTOM.spookySwapRouter, FANTOM.spookySwapLPTusdUsdc, FANTOM.spookySwapMasterChef,
        FANTOM.pidSpookySwapTusdUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategySpookySwapTusdUsdc setting done');
};

module.exports.tags = ['setting', 'StrategySpookySwapTusdUsdcSetting'];

