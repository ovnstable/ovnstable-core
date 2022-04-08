const {ethers} = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');
let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";

module.exports = async () => {

    const strategy = await ethers.getContract("StrategyIdle");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.idleUsdc, POLYGON.wMatic)).wait();
    await (await strategy.setParams(uniswapRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyIdle setting done');
};

module.exports.tags = ['setting', 'StrategyIdleSetting'];
