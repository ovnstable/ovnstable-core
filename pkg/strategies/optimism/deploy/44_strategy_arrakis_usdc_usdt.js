const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { OPTIMISM } = require("@overnight-contracts/common/utils/assets");

let arrakisRouter = "0x9ce88a56d120300061593eF7AD074A1B710094d5";
let arrakisRewards = "0xF78daF7A425098D255bD142D71bBdD8dCf43Ee6c";
let arrakisVault = "0x4c677F67b0D4b55DA85D5b927259A700BA3Da708";
let poolUsdcOpFee = 500; // 0.05%
// 0xF78daF7A425098D255bD142D71bBdD8dCf43Ee6c
// 0x4c677F67b0D4b55DA85D5b927259A700BA3Da708

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                usdt: OPTIMISM.usdt,
                op: OPTIMISM.op,
                arrakisRouter: arrakisRouter,
                arrakisRewards: arrakisRewards,
                arrakisVault: arrakisVault,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcOpFee: poolUsdcOpFee,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleUsdt: OPTIMISM.oracleUsdt,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyArrakisUsdcUsdt'];
