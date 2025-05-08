const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x6B4313a412d2CdeF9317Aaadc0fd518f60889443';
let hedgeExchanger = '0x5Cb33F8F7Ab7800DbFADbb37dCfd12bd2E6dABe1';

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
        asset: BASE.dai,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsIotaDai'];
module.exports.strategyEtsIotaDaiParams = getParams;
