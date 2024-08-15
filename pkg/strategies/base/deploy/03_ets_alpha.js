const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsInch', deployments, save, null);
    });

    await settingSection('AlphaBase', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        rebaseToken: '0xF575a5bF866b14ebb57E344Dbce4Bb44dCeDbfE4',
        hedgeExchanger: '0xe8CCF8F04dE2460313315abEAE9BE079813AE2FF',
        asset: BASE.usdbc,
        underlyingAsset: BASE.usdc,
        oracleAsset: BASE.chainlinkUsdc,
        oracleUnderlyingAsset: BASE.chainlinkUsdc,
        inchSwapper: BASE.inchSwapper,
    };
}

module.exports.tags = ['StrategyEtsAlpha'];
module.exports.strategyEtsAlphaParams = getParams;
