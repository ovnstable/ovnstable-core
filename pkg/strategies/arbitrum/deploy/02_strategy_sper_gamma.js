const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM, BASE} = require("@overnight-contracts/common/utils/assets");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategySperInch', deployments, save, null);
    });

    await settingSection('SperGammaArb', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        sper: '0x97cb73863a4a649Fc3c25c5263d5092c8a1E818C',
        asset: ARBITRUM.usdc,
        underlyingAsset: ARBITRUM.usdcCircle,
        oracleAsset: ARBITRUM.oracleUsdc,
        oracleUnderlyingAsset: ARBITRUM.oracleUsdc,
        inchSwapper: ARBITRUM.inchSwapper,
    };
}

module.exports.tags = ['StrategySperGamma'];
module.exports.getParams = getParams;
module.exports.strategySperGamma = getParams;
