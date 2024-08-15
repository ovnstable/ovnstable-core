const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x51c0b82fBee74eCA15beeD22e20f8c98a9FF429d';
let hedgeExchanger = '0x19c8E2c8dF3273c0F94df301d468Ee870860Bd9e';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {
                asset: POLYGON.usdc,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsGammaPlus'];
