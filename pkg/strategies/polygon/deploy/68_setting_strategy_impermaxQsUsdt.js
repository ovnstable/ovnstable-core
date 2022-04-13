const { ethers } = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

module.exports = async () => {
    await impermaxQsUsdt(POLYGON.imxbTokenQsUsdcUsdt, "StrategyImpermaxQsUsdcUsdt");

    // Uncomment for individual deploy
    // await impermaxQsUsdt(POLYGON.imxbTokenQsMaticUsdt, "StrategyImpermaxQsMaticUsdt");
    // await impermaxQsUsdt(POLYGON.imxbTokenQsWethUsdt, "StrategyImpermaxQsWethUsdt");
    // await impermaxQsUsdt(POLYGON.imxbTokenQsMaiUsdt, "StrategyImpermaxQsMaiUsdt");
};

module.exports.tags = ['setting', 'StrategyImpermaxQsUsdtSetting'];

async function impermaxQsUsdt(imxbToken, strategyName) {
    const strategy = await ethers.getContract(strategyName);

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, imxbToken)).wait();
    await (await strategy.setParams(POLYGON.impermaxRouter, POLYGON.balancerVault, POLYGON.balancerPoolIdUsdcTusdDaiUsdt)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log(`${strategyName} setting done`);
}
