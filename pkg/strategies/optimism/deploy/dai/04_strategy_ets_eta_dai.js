const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xD69fAb1fF729aA352FEb722BcAe753CA84ca5827';
let hedgeExchanger = '0x77020E5b2F9a77667DB39712408cb86c172aeAe9';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsDaiUsdt', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                dai: OPTIMISM.dai,
                usdt: OPTIMISM.usdt,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
                oracleDai: OPTIMISM.oracleDai,
                oracleUsdt: OPTIMISM.oracleUsdt,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsEtaDai'];
