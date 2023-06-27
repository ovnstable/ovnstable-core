const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BSC } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x592Ec0e347Ee8d8fA06065561B5C78aC009Aa268';
let hedgeExchanger = '0xabD6d101D4a672258B41a193e154C3b5441dDAB1';

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEts', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        asset: BSC.usdt,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsDelta'];
module.exports.getParams = getParams;
module.exports.strategyEtsLambda = getParams;
