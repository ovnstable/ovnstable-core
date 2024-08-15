const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xF15319E054f01839CFd1ABdb9EBdF12197635C24';
let hedgeExchanger = '0x03afE3617e5251b976B9D20A3Efb68Eab7799479';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                asset: OPTIMISM.dai,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsSigmaDaiPlus'];
