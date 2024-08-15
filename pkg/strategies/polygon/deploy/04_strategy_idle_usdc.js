const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deployProxy('StrategyIdle', deployments, save);

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(POLYGON.usdc, POLYGON.idleUsdc, POLYGON.wMatic)).wait();
        await (await strategy.setParams(POLYGON.quickSwapRouter)).wait();
    });
};

module.exports.tags = ['StrategyIdle'];
