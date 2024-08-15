const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x25c7a57D0B1Fe58BAf35b52916128028e0652A24';
let hedgeExchanger = '0x544c09424Dfc2865c05DeDcaDf5801E09a1F8dCC';

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
        asset: ARBITRUM.usdc,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsKappa'];
module.exports.getParams = getParams;
module.exports.strategyEtsKappa = getParams;
