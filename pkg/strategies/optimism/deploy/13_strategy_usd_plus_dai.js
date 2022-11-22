const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let usdPlus = '0x73cb180bf0521828d8849bc8CF2B920918e23032';
let exchange = '0xe80772Eaf6e2E18B651F160Bc9158b2A5caFCA65';
let poolUsdcDaiFee = 100; // 0.01%
let swapSlippage = 10; // 0.1%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                daiToken: OPTIMISM.dai,
                usdcToken: OPTIMISM.usdc,
                usdPlus: usdPlus,
                exchange: exchange,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleDai: OPTIMISM.oracleDai,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcDaiFee: poolUsdcDaiFee,
                swapSlippage: swapSlippage
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyUsdPlusDai'];
