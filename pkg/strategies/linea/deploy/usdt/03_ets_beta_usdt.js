const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { LINEA } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x2253BdD62eA63F7CBbf92785EEdcCAc7521FB6A1';
let hedgeExchanger = '0x40ae104C59af1B9d23Dcd9c5715780E2132631f1';

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
        asset: LINEA.usdt,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsBetaUsdt'];
module.exports.strategyEtsBetaUsdtParams = getParams;
