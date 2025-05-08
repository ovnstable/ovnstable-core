const { deployProxy, deployProxyMulti } = require('@overnight-contracts/common/utils/deployProxy');
const { deploySection, settingSection } = require('@overnight-contracts/common/utils/script-utils');
const { BASE } = require('@overnight-contracts/common/utils/assets');

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async name => {
        await deployProxyMulti(name, 'StrategySwapToOvn', deployments, save);
    });

    await settingSection('', async strategy => {
        await (await strategy.setParams(await getParams())).wait();
        await (await strategy.setStrategyName("StrategySwapToOvn")).wait();

    });
};

async function getParams() {
    return {
        usdPlus: BASE.usdPlus,
        ovn: BASE.ovn,
        inchSwapper: BASE.inchSwapper,
        slippageBp: 500,
        ovnOraclePriceExpiration: 120,   // 120 seconds
        ovnUsdPriceDecimals: 10
    };
}

module.exports.tags = ['StrategySwapToOvn'];
module.exports.strategySwapToOvnParams = getParams;
