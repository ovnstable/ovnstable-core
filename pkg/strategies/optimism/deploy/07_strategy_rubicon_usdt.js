const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let poolUsdcOpFee = 500; // 0.05%
let poolUsdcUsdtFee = 100; // 0.01%
let rubiconUsdt = '0xffbd695bf246c514110f5dae3fa88b8c2f42c411';

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
                opToken: OPTIMISM.op,
                rubiconUsdt: rubiconUsdt,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcOpFee: poolUsdcOpFee,
                poolUsdcUsdtFee: poolUsdcUsdtFee,
                oracleUsdt: OPTIMISM.oracleUsdt,
                oracleUsdc: OPTIMISM.oracleUsdc,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyRubiconUsdt'];
