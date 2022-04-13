const {ethers} = require("hardhat");

let {FANTOM} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyTarotSpiritUsdcFtm");

    await (await strategy.setTokens(FANTOM.usdc, FANTOM.bTarotSpirit)).wait();
    await (await strategy.setParams(FANTOM.tarotRouter)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log('StrategyTarotSpiritUsdcFtm setting done');
};

module.exports.tags = ['setting', 'StrategyTarotSpiritUsdcFtmSetting'];
