const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ZKSYNC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x41c9d632c79aD3B7765D5b6BCff1525A8400e89c';
let hedgeExchanger = '0xe2D81fB2778463eD6AAD03bE28663fDa65A0889a';

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

module.exports.tags = ['StrategyEtsAlpha'];
module.exports.strategyEtsAlphaParams = getParams;
