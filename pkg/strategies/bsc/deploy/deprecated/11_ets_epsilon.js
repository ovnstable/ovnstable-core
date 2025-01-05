const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BSC } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xA6f2B23b73117e710f6eF369ABfB72A22FB43ff5';
let hedgeExchanger = '0xEf108f04b24ad574673BFA8AE1cE4c2524951B72';

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
        asset: BSC.usdt,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsEpsilon'];
module.exports.getParams = getParams;
module.exports.strategyEtsEpsilon = getParams;
