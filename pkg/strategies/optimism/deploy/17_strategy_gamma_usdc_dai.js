const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let lpToken = '0xaED05fdd471a4EecEe48B34d38c59CC76681A6C8';
let uniProxy = '0xf874D4957861E193AEC9937223062679C14f9Aca';
let masterChef = '0xC7846d1bc4d8bcF7c45a7c998b77cE9B3c904365';
let pid = 1;
let beethovenxVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let beethovenxPoolIdUsdc = "0xedcfaf390906a8f91fb35b7bac23f3111dbaee1c00000000000000000000007c";
let beethovenxPoolIdDaiUsdtUsdc = "0x428e1cc3099cf461b87d124957a0d48273f334b100000000000000000000007f";
let beethovenxPoolIdDai = "0x62ec8b26c08ffe504f22390a65e6e3c1e45e987700000000000000000000007e";
let bbRfAUsdc = "0xEdcfaF390906a8f91fb35B7bAC23f3111dBaEe1C";
let bbRfADai = "0x62eC8b26C08Ffe504F22390A65e6E3c1e45E9877";
let poolFeeOpUsdc = 500; // 0.05%
let kyberSwapRouter = "0xC1e7dFE73E1598E3910EF4C7845B68A9Ab6F4c83";
let poolUsdcDaiFee = 8; // 0.008%

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
                lpToken: lpToken,
                uniProxy: uniProxy,
                masterChef: masterChef,
                pid: pid,
                beethovenxVault: beethovenxVault,
                beethovenxPoolIdUsdc: beethovenxPoolIdUsdc,
                beethovenxPoolIdDaiUsdtUsdc: beethovenxPoolIdDaiUsdtUsdc,
                beethovenxPoolIdDai: beethovenxPoolIdDai,
                bbRfAUsdc: bbRfAUsdc,
                bbRfADai: bbRfADai,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolFeeOpUsdc: poolFeeOpUsdc,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleDai: OPTIMISM.oracleDai,
                kyberSwapRouter: kyberSwapRouter,
                poolUsdcDaiFee: poolUsdcDaiFee,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyGammaUsdcDai'];
