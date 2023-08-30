const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xE413C3b035f6740BE6f40D701245C7668cD3Fc3D';
let hedgeExchanger = '0x088984519b6Ad5dc0358fd7c7E592090E2f963DD';

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

module.exports.tags = ['StrategyEtsGamma'];
module.exports.strategyEtsGammaParams = getParams;
