const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM, ZKSYNC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xBaCfF3c0514B9B5cf0a4a457f57171E9fbBead8a';
let hedgeExchanger = '0x245eA489000a4a2fE1c7B52886b1aF7d2E2C0fFb';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                asset: ZKSYNC.usdc,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsBeta'];
