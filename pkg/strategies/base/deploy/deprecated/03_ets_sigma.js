const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection('SigmaBase', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        rebaseToken: '0xe98E1f0e65C1c18822DaE62a6DAa8cC43b3A3A68',
        hedgeExchanger: '0x87Ff480D89f54a379735700Bcb845835a9b57ef8',
        asset: BASE.usdc,
    };
}

module.exports.tags = ['StrategyEtsSigma'];
module.exports.strategyEtsSigmaParams = getParams;
