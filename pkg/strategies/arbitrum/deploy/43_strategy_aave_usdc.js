const { deployProxy, deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM } = require('@overnight-contracts/common/utils/assets');
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyAave', deployments, save);
    });

    await settingSection('Aave USDC', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {

    return {
        usdc: ARBITRUM.usdcCircle,
        aUsdc: ARBITRUM.aUsdcCircle,
        aaveProvider: ARBITRUM.aaveProvider,
    }
}

module.exports.tags = ['StrategyAaveUsdc'];
