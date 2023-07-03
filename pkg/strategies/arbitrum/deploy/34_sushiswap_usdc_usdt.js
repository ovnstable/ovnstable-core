const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: ARBITRUM.usdc,
        usdt: ARBITRUM.usdt,
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleUsdt: ARBITRUM.oracleUsdt,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        npm: '0xF0cBce1942A68BEB3d1b73F0dd86C8DCc363eF49',
        pool: '0xD9e96F78B3C68BA79fd4DfAd4Ddf4F27bD1e2ECF',
        tickLower: -887272,
        tickUpper: 887272,
    }
}

module.exports.tags = ['StrategySushiswapUsdcUsdt'];
module.exports.getParams = getParams;
module.exports.StrategySushiswapUsdcUsdt = getParams;
