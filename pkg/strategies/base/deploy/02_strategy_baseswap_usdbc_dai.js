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
        usdbc: BASE.usdbc,
        dai: BASE.dai,
        weth: BASE.weth,
        bswap: BASE.bswap,
        oracleUsdbc: BASE.chainlinkUsdc,
        oracleDai: BASE.chainlinkDai,
        router: BASE.baseSwapRouter,
        masterChef: '0x2B0A43DCcBD7d42c18F6A83F86D1a19fA58d541A',
        pair: '0x6D3c5a4a7aC4B1428368310E4EC3bB1350d01455', // DAI/USDbC
        pid: 5,
        uniswapV3Router: BASE.uniswapV3Router,
        poolFee: 100, // 0.01%
    }

}

module.exports.tags = ['StrategyBaseSwapUsdbcDai'];
module.exports.strategyBaseSwapUsdbcDai = getParams;
