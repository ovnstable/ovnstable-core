const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BASE} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BASE.usdc,
        aUsdc: BASE.aUsdc,
        aaveProvider: BASE.aaveProvider
    };
}

module.exports.tags = ['StrategyAave'];
