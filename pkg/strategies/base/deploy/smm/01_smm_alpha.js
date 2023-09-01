const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x9a1F3333F573664465E19f1d71721135393a4F46';
let hedgeExchanger = '0xE4A765E2D178c007Ba04B444f172e99b10F70421';

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        asset: BASE.usdbc,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategySmmAlpha'];
module.exports.strategySmmAlphaParams = getParams;
