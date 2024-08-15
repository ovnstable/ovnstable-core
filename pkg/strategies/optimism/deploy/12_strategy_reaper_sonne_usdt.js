const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let soUsdt = '0xD84D315f22565399ABFCb2b9C836955401C01A47';
let poolUsdcUsdtFee = 100; // 0.01%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdcToken: OPTIMISM.usdc,
                usdtToken: OPTIMISM.usdt,
                soUsdt: soUsdt,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleUsdt: OPTIMISM.oracleUsdt,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcUsdtFee: poolUsdcUsdtFee,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyReaperSonneUsdt'];
