const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let arrakisRouter = "0x86D62A8AD19998E315e6242b63eB73F391D4674B";
let arrakisRewards = "0x87c7c885365700D157cd0f39a7803320fe86f0f5";
let arrakisVault = "0x632336474f5Bf11aEbECd63B84A0a2800B99a490";
let beethovenxVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let beethovenxPoolIdUsdc = "0xba7834bb3cd2db888e6a06fb45e82b4225cd0c71000000000000000000000043";
let beethovenxPoolIdDaiUsdtUsdc = "0x6222ae1d2a9f6894da50aa25cb7b303497f9bebd000000000000000000000046";
let beethovenxPoolIdDai = "0x888a6195d42a95e80d81e1c506172772a80b80bc000000000000000000000044";
let bbRfAUsdc = "0xba7834bb3cd2DB888E6A06Fb45E82b4225Cd0C71";
let bbRfADai = "0x888a6195D42a95e80D81e1c506172772a80b80Bc";
let poolUsdcOpFee = 500; // 0.05%
let swapSlippageBp = 4;
let allowedSlippageBp = 10;

module.exports = async ({deployments}) => {
    const {save} = deployments;

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
                beethovenxVault: beethovenxVault,
                beethovenxPoolIdUsdc: beethovenxPoolIdUsdc,
                beethovenxPoolIdDaiUsdtUsdc: beethovenxPoolIdDaiUsdtUsdc,
                beethovenxPoolIdDai: beethovenxPoolIdDai,
                bbRfAUsdc: bbRfAUsdc,
                bbRfADai: bbRfADai,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcOpFee: poolUsdcOpFee,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleDai: OPTIMISM.oracleDai,
                swapSlippageBp: swapSlippageBp,
                allowedSlippageBp: allowedSlippageBp,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyArrakisUsdcDai'];
