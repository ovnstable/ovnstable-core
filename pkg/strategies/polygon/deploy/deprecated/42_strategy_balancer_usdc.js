const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {POLYGON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");

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
        usdc: POLYGON.usdc,
        bal: POLYGON.bal,
        bbamUsdc: "0xF93579002DBE8046c43FEfE86ec78b1112247BB8",
        bbamUsdt: "0xFf4ce5AAAb5a627bf82f4A571AB1cE94Aa365eA6",
        bbamDai: "0x178E029173417b1F9C8bC16DCeC6f697bC323746",
        bpt: "0x48e6B98ef6329f8f0A30eBB8c7C960330d648085",
        vault: "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
        gauge: "0x1c514fEc643AdD86aeF0ef14F4add28cC3425306",
        bbamUsdcPoolId: "0xf93579002dbe8046c43fefe86ec78b1112247bb8000000000000000000000759",
        bbamUsdPoolId: "0x48e6b98ef6329f8f0a30ebb8c7c960330d64808500000000000000000000075b",
        balPoolId: "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002",
        oracleUsdc: POLYGON.oracleChainlinkUsdc,
        oracleUsdt: POLYGON.oracleChainlinkUsdt,
        oracleDai: POLYGON.oracleChainlinkDai,
        uniswapV3Router: POLYGON.uniswapV3Router,
        usdt: POLYGON.usdt,
        dai: POLYGON.dai,
        bbamUsdtPoolId: "0xff4ce5aaab5a627bf82f4a571ab1ce94aa365ea600000000000000000000075a",
        bbamDaiPoolId: "0x178e029173417b1f9c8bc16dcec6f697bc323746000000000000000000000758",
    };
}

module.exports.tags = ['StrategyBalancerUsdc'];
module.exports.getParams = getParams;
module.exports.strategyBalancerUsdcParams = getParams;
