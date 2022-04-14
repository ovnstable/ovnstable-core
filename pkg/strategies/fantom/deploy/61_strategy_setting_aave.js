const {ethers} = require("hardhat");

let {FANTOM} = require('@overnight-contracts/common/utils/assets');
let {core} = require('@overnight-contracts/common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyAave");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.amUsdc)).wait();
    await (await strategy.setParams(FANTOM.aaveProvider)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyAave setting done');
};

module.exports.tags = ['setting', 'StrategyAaveSetting'];
