const { deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM, BASE } = require("@overnight-contracts/common/utils/assets");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");


module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategySperInch', deployments, save, null);
    });

    await settingSection('SperDeltaArb', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        sper: '0x7bB03290F5B6e70d2138ed2aA88fD36e7212456b',
        asset: ARBITRUM.usdt,
        underlyingAsset: ARBITRUM.usdcCircle,
        oracleAsset: ARBITRUM.oracleUsdt,
        oracleUnderlyingAsset: ARBITRUM.oracleUsdc,
        inchSwapper: ARBITRUM.inchSwapper,
    };
}

module.exports.tags = ['StrategySperDelta'];
module.exports.getParams = getParams;
module.exports.strategySperDelta = getParams;
