const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ZKSYNC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xaE4913D828BD97fF7CffdcfbE7E0Fb6b4Effcf05';
let hedgeExchanger = '0x9c8B0eC38A1ddFbCbD2A9b5F5453a8c737fca5AD';

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
        asset: ZKSYNC.usdc,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    }
}

module.exports.tags = ['StrategyEtsGamma'];
module.exports.strategyEtsGammaParams = getParams;
