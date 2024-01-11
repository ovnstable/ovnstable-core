const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsInch', deployments, save, null);
    });

    await settingSection('BetaBase', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        rebaseToken: '0xea8448d927D8d98165Eb839843D1818c4b333981',
        hedgeExchanger: '0xcB2e0fEdf94f94b49d50904DB2f6DC034BC7ffa9',
        asset: BASE.dai,
        underlyingAsset: BASE.usdc,
        oracleAsset: BASE.chainlinkDai,
        oracleUnderlyingAsset: BASE.chainlinkUsdc,
        inchSwapper: BASE.inchSwapper,
    };
}

module.exports.tags = ['StrategyEtsBeta'];
module.exports.strategyEtsBetaParams = getParams;
