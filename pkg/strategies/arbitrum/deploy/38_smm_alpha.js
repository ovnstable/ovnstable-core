const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsInch', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        rebaseToken: '0x13753271531cEF0AeF75db66035519Eb8dC95740',
        hedgeExchanger: '0x42a6079C56258137a48D0EeA0c015ACB5e74D55E',
        asset: ARBITRUM.usdc,
        underlyingAsset: ARBITRUM.usdcCircle,
        oracleAsset: ARBITRUM.oracleUsdc,
        oracleUnderlyingAsset: ARBITRUM.oracleUsdc,
        inchSwapper: ARBITRUM.inchSwapper,
    };
}

module.exports.tags = ['StrategySmmAlpha'];
module.exports.strategySmmAlphaParams = getParams;
