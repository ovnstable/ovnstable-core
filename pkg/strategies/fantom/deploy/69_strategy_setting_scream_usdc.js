const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyScream");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.scream)).wait();
    await (await strategy.setParams(FANTOM.screamTokenDelegator, FANTOM.screamUnitroller, FANTOM.spookySwapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyScream setting done');
};

module.exports.tags = ['setting', 'StrategyScreamSetting'];
