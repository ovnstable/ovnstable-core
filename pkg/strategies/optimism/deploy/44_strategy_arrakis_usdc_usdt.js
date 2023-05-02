const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { OPTIMISM } = require("@overnight-contracts/common/utils/assets");

let arrakisRouter = "0x9ce88a56d120300061593eF7AD074A1B710094d5";
let arrakisRewards = "0x1B6a53991f257Ac9dD1D0C061c37E1BE36e0A8e6";
let arrakisVault = "0x3f46cb62fc047273adf302670c7db569a02107eb";
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
