const {ethers} = require("hardhat");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyIdle");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.idleUsdc, POLYGON.wMatic)).wait();
    await (await strategy.setParams(POLYGON.quickSwapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyIdle setting done');
};

module.exports.tags = ['setting', 'StrategyIdleSetting'];
