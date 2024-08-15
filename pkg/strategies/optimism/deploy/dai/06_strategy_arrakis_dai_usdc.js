const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { OPTIMISM } = require("@overnight-contracts/common/utils/assets");

let arrakisRouter = "0x9ce88a56d120300061593ef7ad074a1b710094d5";
let arrakisRewards = "0x499B7CBd0f84318feE1edDeD7B5458f6F4500AB3";
let arrakisVault = "0xa2EA10d2E018cdFa656e129fD187Cfa84F527557";
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

module.exports.tags = ['StrategyArrakisDaiUsdc'];
