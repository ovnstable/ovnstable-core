const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '';
let hedgeExchanger = '';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                asset: OPTIMISM.usdc,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsGamma'];
