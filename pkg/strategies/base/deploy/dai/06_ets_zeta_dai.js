const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xCe19D5FB70fa1e53F4EC397523604C2a100F7016';
let hedgeExchanger = '0x0E4E445e1d19fDD574CB533355D30ed89597bbDb';

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
        asset: BASE.dai,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsZetaDai'];
module.exports.strategyEtsZetaDaiParams = getParams;
