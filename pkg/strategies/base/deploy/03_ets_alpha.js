const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BSC, BASE} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x494cDC9ECdE630179f31754480acA7179000a881';
let hedgeExchanger = '0x181AAb77E68CD6803f60cbAE88674dE20101bf3f';

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
        asset: BASE.usdbc,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsAlpha'];
module.exports.getParams = getParams;
module.exports.strategyEtsAlpha = getParams;
