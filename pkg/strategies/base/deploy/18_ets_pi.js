const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");


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
        rebaseToken: '0xEB5c0Ed20f92892Ba688F9b7ca8b4658ee3a3D49',
        hedgeExchanger: '0x4A3d10950b237399C3f6818Ad05f398055a9b382',
        asset: BASE.usdbc,
        underlyingAsset: BASE.usdc,
        oracleAsset: BASE.chainlinkUsdc,
        oracleUnderlyingAsset: BASE.chainlinkUsdc,
        inchSwapper: BASE.inchSwapper,
    };
}

module.exports.tags = ['StrategyEtsPi'];
module.exports.strategyEtsPiParams = getParams;
