const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

let pidSpookySwapMaiUsdc = 42;
let poolIdMaiUsdc = "0x2c580c6f08044d6dfaca8976a66c8fadddbd9901000000000000000000000038";
let poolIdBooUsdc = "0x0459a6e0478644a87ee1371ecf944f403ac65522000200000000000000000222";

module.exports = async () => {
    const strategy = await ethers.getContract("StrategySpookySwapMaiUsdc");

    await (await strategy.setTokens(FANTOM.mai, FANTOM.usdc, FANTOM.boo)).wait();
    await (await strategy.setParams(FANTOM.spookySwapRouter, FANTOM.spookySwapLPMaiUsdc, FANTOM.spookySwapMasterChef,
        pidSpookySwapMaiUsdc, FANTOM.beethovenxVault, poolIdMaiUsdc, poolIdBooUsdc)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategySpookySwapMaiUsdc setting done');
};

module.exports.tags = ['setting', 'StrategySpookySwapMaiUsdcSetting'];

