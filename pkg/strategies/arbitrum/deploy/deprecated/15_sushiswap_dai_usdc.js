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
        dai: ARBITRUM.dai,
        usdc: ARBITRUM.usdc,
        weth: ARBITRUM.weth,
        sushi: ARBITRUM.sushi,
        oracleDai: ARBITRUM.oracleDai,
        oracleUsdc: ARBITRUM.oracleUsdc,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        sushiswapRouter: ARBITRUM.sushiswapRouter,
        npm: '0xF0cBce1942A68BEB3d1b73F0dd86C8DCc363eF49',
        pool: '0x1698837611EEE2118DBe874eE84f3fA52eA49a52',
        tickLower: -887272,
        tickUpper: 887272,
    }
}

module.exports.tags = ['StrategySushiswapDaiUsdc'];
module.exports.getParams = getParams;
module.exports.StrategySushiswapDaiUsdc = getParams;
