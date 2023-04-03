const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x5B852898CD47d2Be1d77D30377b3642290f5Ec75';
let hedgeExchanger = '0x65AfD05fbc4413948ffaaD8bCb13f71b6f79332D';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsUsdt', deployments, save, null);
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

module.exports.tags = ['StrategyEtsAlphaUsdt'];
