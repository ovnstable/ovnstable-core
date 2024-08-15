const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x6E4300886a83e5657623bB8Eee3C08e086d3BbEb';
let hedgeExchanger = '0x3F849A5A3520c23452edFb24862F8B1D63b8d6E3';

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
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    }
};

module.exports.tags = ['StrategyEtsTau'];
module.exports.strategyEtsTauParams = getParams;
