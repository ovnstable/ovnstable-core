const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let lpToken = '0xaED05fdd471a4EecEe48B34d38c59CC76681A6C8';
let uniProxy = '0x40a3E5778f66835265602f92D507AeC708c2C0AD';
let masterChef = '0xC7846d1bc4d8bcF7c45a7c998b77cE9B3c904365';
let pid = 1;
let poolFeeOpUsdc = 500; // 0.05%

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
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolFeeOpUsdc: poolFeeOpUsdc,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleDai: OPTIMISM.oracleDai,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyGammaUsdcDai'];
