const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM, BASE} = require("@overnight-contracts/common/utils/assets");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategySperInch', deployments, save, null);
    });

    await settingSection('SperBetaArb', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        sper: ZERO_ADDRESS,
        asset: ARBITRUM.usdt,
        underlyingAsset: ARBITRUM.usdc,
        oracleAsset: ARBITRUM.oracleUsdt,
        oracleUnderlyingAsset: ARBITRUM.oracleUsdc,
        inchSwapper: ARBITRUM.inchSwapper,
    };
}

module.exports.tags = ['StrategySperBeta'];
module.exports.getParams = getParams;
module.exports.strategySperBeta = getParams;
