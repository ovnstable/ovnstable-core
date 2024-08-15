const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xf7bb71611875b26e03B2cdD6EFAFE611AD0a8116';
let hedgeExchanger = '0xEf2f95B17c365948676Fa6709521541180DbE0cb';

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
        asset: ARBITRUM.usdc,
        rebaseToken: rebaseToken,
        hedgeExchanger: hedgeExchanger,
    };
}

module.exports.tags = ['StrategyEtsLambda'];
module.exports.getParams = getParams;
module.exports.strategyEtsLambda = getParams;
