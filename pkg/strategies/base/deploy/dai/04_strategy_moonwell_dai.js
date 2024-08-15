const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BASE} = require("@overnight-contracts/common/utils/assets");

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
        dai: BASE.dai,
        usdbc: BASE.usdbc,
        well: BASE.well,
        weth: BASE.weth,
        mDai: BASE.moonwellDai,
        unitroller: BASE.moonwellUnitroller,
        uniswapV3Router: BASE.uniswapV3Router,
        poolFeeWethUsdbc: 500, // 0.05%
        poolFeeUsdbcDai: 100, // 0.01%
        aerodromeRouter: BASE.aerodromeRouter,
        poolWellWeth: '0x89D0F320ac73dd7d9513FFC5bc58D1161452a657',
    }
}

module.exports.tags = ['StrategyMoonwellDai'];
module.exports.strategyMoonwellDaiParams = getParams;
