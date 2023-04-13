const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x8De947B7510FB4511a0a97D515813607D2F3f13c';
let hedgeExchanger = '0x6CB841a321bCbEd949B14838339a2EBb6331e5d1';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                asset: BSC.usdt,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsBetaUsdt'];
