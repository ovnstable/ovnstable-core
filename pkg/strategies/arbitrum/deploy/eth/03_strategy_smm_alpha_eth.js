const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x0DEDc79C1E84C2688a07C3b7dcb967407b360747';
let hedgeExchanger = '0xDADD248Ee91e6034F46eaa26aE5fC52482B42888';

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
        asset: ARBITRUM.weth,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategySmmAlphaEth'];
module.exports.strategySmmAlphaEthParams = getParams;
