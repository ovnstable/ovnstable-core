const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        asset: OPTIMISM.usdc,
        rebaseToken: '0x909CC74fa5FC832Cc1C5c7D2d9DDD1574127D231',
        hedgeExchanger: '0x2533A096f9716C9403A59d7a1877581D1CFC8AC9',
    };
}

module.exports.tags = ['StrategyEtsKappa'];
module.exports.getParams = getParams;
module.exports.strategyEtsKappa = getParams;
