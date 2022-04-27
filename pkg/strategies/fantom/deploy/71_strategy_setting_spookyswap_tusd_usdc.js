const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let pidSpookySwapTusdUsdc = 45;
let poolIdTusdUsdc = "0xcf9d4940fe4c194c83d4d3b1de4c2dff4233f612000200000000000000000253";
let poolIdBooUsdc = "0x0459a6e0478644a87ee1371ecf944f403ac65522000200000000000000000222";

module.exports = async () => {
    const strategy = await ethers.getContract("StrategySpookySwapTusdUsdc");

    await (await strategy.setTokens(FANTOM.tusd, FANTOM.usdc, FANTOM.boo)).wait();
    await (await strategy.setParams(FANTOM.spookySwapRouter, FANTOM.spookySwapLPTusdUsdc, FANTOM.spookySwapMasterChef,
        pidSpookySwapTusdUsdc, FANTOM.beethovenxVault, poolIdTusdUsdc, poolIdBooUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategySpookySwapTusdUsdc setting done');
};

module.exports.tags = ['setting', 'StrategySpookySwapTusdUsdcSetting'];

