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
        weth: BASE.weth,
        bswap: BASE.bswap,
        oracleDai: BASE.chainlinkDai,
        oracleUsdbc: BASE.chainlinkUsdc,
        router: BASE.baseSwapRouter,
        masterChef: '0x2B0A43DCcBD7d42c18F6A83F86D1a19fA58d541A',
        pair: '0x6D3c5a4a7aC4B1428368310E4EC3bB1350d01455', // DAI/USDbC
        pid: 5,
        uniswapV3Router: BASE.uniswapV3Router,
        poolFee: 100, // 0.01%
        pool: '0xEC652B590Fe21dcd18Ea01253B5152b202cc3dEb',
        bsx: BASE.bsx,
    }

}

module.exports.tags = ['StrategyBaseSwapDaiUsdbc'];
module.exports.strategyBaseSwapDaiUsdbcParams = getParams;
