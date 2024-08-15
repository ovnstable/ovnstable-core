const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { OPTIMISM } = require("@overnight-contracts/common/utils/assets");

let arrakisRouter = "0x9ce88a56d120300061593eF7AD074A1B710094d5";
let arrakisRewards = "0x87c7c885365700D157cd0f39a7803320fe86f0f5";
let arrakisVault = "0x632336474f5Bf11aEbECd63B84A0a2800B99a490";
let poolUsdcOpFee = 100; // 0.01%

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                dai: OPTIMISM.dai,
                op: OPTIMISM.op,
                arrakisRouter: arrakisRouter,
                arrakisRewards: arrakisRewards,
                arrakisVault: arrakisVault,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcOpFee: poolUsdcOpFee,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleDai: OPTIMISM.oracleDai,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyArrakisUsdcDai'];
