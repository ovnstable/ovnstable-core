const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { POLYGON } = require("@overnight-contracts/common/utils/assets");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: POLYGON.usdc,
        usdt: POLYGON.usdt,
        dai: POLYGON.dai,
        crv: POLYGON.crv,
        wmatic: POLYGON.wMatic,
        lpToken: '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171',
        pool: '0x445FE580eF8d70FF569aB36e80c647af338db351',
        booster: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31',
        rewardPool: '0xf25958C64634FD5b5eb10539769aA6CAB355599A',
        pid: 2,
        uniswapV3Router: POLYGON.uniswapV3Router,
        synapseSwap: POLYGON.synapseSwapRouter,
        oracleUsdc: POLYGON.oracleChainlinkUsdc,
        oracleUsdt: POLYGON.oracleChainlinkUsdt,
        oracleDai: POLYGON.oracleChainlinkDai,
    };
}

module.exports.tags = ['StrategyCurveConvex3Pool'];
module.exports.getParams = getParams;
module.exports.strategyEtsLambda = getParams;
