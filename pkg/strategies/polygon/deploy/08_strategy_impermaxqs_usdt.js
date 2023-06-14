const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {ethers} = require("hardhat");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxyMulti('StrategyImpermaxQsUsdcUsdt', 'StrategyImpermaxQsUsdt', deployments, save);

    // Uncomment for individual deploy
    // await deployProxyMulti('StrategyImpermaxQsMaticUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
    // await deployProxyMulti('StrategyImpermaxQsWethUsdt', 'StrategyImpermaxQsUsdt', deployments, save);
    // await deployProxyMulti('StrategyImpermaxQsMaiUsdt', 'StrategyImpermaxQsUsdt', deployments, save);

    await impermaxQsUsdt(POLYGON.imxbTokenQsUsdcUsdt, "StrategyImpermaxQsUsdcUsdt");

    // Uncomment for individual deploy
    // await impermaxQsUsdt(POLYGON.imxbTokenQsMaticUsdt, "StrategyImpermaxQsMaticUsdt");
    // await impermaxQsUsdt(POLYGON.imxbTokenQsWethUsdt, "StrategyImpermaxQsWethUsdt");
    // await impermaxQsUsdt(POLYGON.imxbTokenQsMaiUsdt, "StrategyImpermaxQsMaiUsdt");
};

async function impermaxQsUsdt(imxbToken, strategyName) {
    const strategy = await ethers.getContract(strategyName);

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, imxbToken)).wait();
    await (await strategy.setParams(POLYGON.impermaxRouter, POLYGON.balancerVault, POLYGON.balancerPoolIdUsdcTusdDaiUsdt)).wait();
    await (await strategy.setPortfolioManager(core.pm)).wait();

    console.log(`${strategyName} setting done`);
}

module.exports.tags = ['StrategyImpermaxQsUsdt'];
