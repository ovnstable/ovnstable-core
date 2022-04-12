const {ethers} = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyAave");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.amUsdc)).wait();
    await (await strategy.setParams(POLYGON.aaveProvider)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyAave setting done');
};

module.exports.tags = ['setting', 'StrategyAaveSetting'];
