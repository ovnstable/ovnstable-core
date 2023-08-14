const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BSC, BASE} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x304b98F3f4096F94B8F09e8944eF255b04545e96';
let hedgeExchanger = '0xDfE7686F072013f78F94709DbBE528bFC864009C';

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

module.exports.tags = ['StrategyEtsBeta'];
module.exports.getParams = getParams;
module.exports.strategyEtsBeta = getParams;
