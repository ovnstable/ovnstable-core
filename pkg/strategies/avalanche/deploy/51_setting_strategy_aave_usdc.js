const {ethers} = require("hardhat");

let {AVALANCHE} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyAave");

    await (await strategy.setTokens(AVALANCHE.usdc, AVALANCHE.aUsdc)).wait();
    await (await strategy.setParams(AVALANCHE.aaveProvider)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyAave setting done');
};

module.exports.tags = ['setting', 'StrategyAaveSetting'];
