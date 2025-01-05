const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsInch', deployments, save, null);
    });

    await settingSection('RhoBase', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        rebaseToken: '0x7ccAE37033Ef476477BB98693D536D87fdb8d2aF',
        hedgeExchanger: '0x0f67BceF1804612523D61a86A2FFC9849bBd00cA',
        asset: BASE.usdbc,
        underlyingAsset: BASE.usdc,
        oracleAsset: BASE.chainlinkUsdc,
        oracleUnderlyingAsset: BASE.chainlinkUsdc,
        inchSwapper: BASE.inchSwapper,
    };
}

module.exports.tags = ['StrategyEtsRho'];
module.exports.strategyEtsRhoParams = getParams;
