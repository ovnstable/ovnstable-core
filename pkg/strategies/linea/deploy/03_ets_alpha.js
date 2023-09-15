const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { LINEA } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xC98C43CADfC611eABC08940a86B910C6433FA12A';
let hedgeExchanger = '0x631e1a02B52e48311c7FC91F55FfB15c26b50503';

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
        asset: LINEA.usdc,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsAlpha'];
module.exports.strategyEtsAlphaParams = getParams;
