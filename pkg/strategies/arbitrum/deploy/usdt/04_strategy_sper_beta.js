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
        sper: '0xF64d2b156Bc6Dc4a2d1FdD9daE7F7C11E3069Bb9',
        asset: ARBITRUM.usdt,
        underlyingAsset: ARBITRUM.usdcCircle,
        oracleAsset: ARBITRUM.oracleUsdt,
        oracleUnderlyingAsset: ARBITRUM.oracleUsdc,
        inchSwapper: ARBITRUM.inchSwapper,
    };
}

module.exports.tags = ['StrategySperBeta'];
module.exports.getParams = getParams;
module.exports.strategySperBeta = getParams;
