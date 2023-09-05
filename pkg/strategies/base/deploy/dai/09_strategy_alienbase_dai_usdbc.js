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
        alb: BASE.alb,
        oracleDai: BASE.chainlinkDai,
        oracleUsdbc: BASE.chainlinkUsdc,
        alienBaseRouter: BASE.alienBaseRouter,
        swapFlashLoan: '0x927860797d07b1C46fbBe7f6f73D45C7E1BFBb27',
        masterChef: '0x52eaeCAC2402633d98b95213d0b473E069D86590',
        pair: '0x840dCB7b4d3cEb906EfD00c8b5F5c5Dd61d7f8a6',
        pid: 12,
        uniswapV3Router: BASE.uniswapV3Router,
        poolFee: 100, // 0.01%
    }

}

module.exports.tags = ['StrategyAlienBaseDaiUsdbc'];
module.exports.strategyAlienBaseDaiUsdbcParams = getParams;
