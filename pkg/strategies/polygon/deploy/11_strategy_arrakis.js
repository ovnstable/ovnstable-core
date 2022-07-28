const {deployProxy} = require("../../../common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let arrakisRewards = "0x56C5b00Bdeb3cb8aDF745650599f9AdeF3c40275"; // USDC/USDT
let arrakisVault = "0x2817E729178471DBAC8b1FC190b4fd8e6F3984e3";

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(POLYGON.usdc, POLYGON.usdt, POLYGON.wMatic)).wait();
        await (await strategy.setParams(
            POLYGON.arrakisRouter,
            arrakisRewards,
            arrakisVault,
            POLYGON.balancerVault,
            POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
            POLYGON.balancerPoolIdWmaticUsdcWethBal,
            POLYGON.uniswapV3PositionManager,
            POLYGON.oracleChainlinkUsdc,
            POLYGON.oracleChainlinkUsdt
        )).wait();
    });
};

module.exports.tags = [ 'StrategyArrakis'];
