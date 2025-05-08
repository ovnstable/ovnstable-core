const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xF15319E054f01839CFd1ABdb9EBdF12197635C24';
let hedgeExchanger = '0x03afE3617e5251b976B9D20A3Efb68Eab7799479';
let poolUsdcDaiFee = 100; // 0.01%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsUsdcDai', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                dai: OPTIMISM.dai,
                rebaseToken: rebaseToken,
                hedgeExchanger: hedgeExchanger,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcDaiFee: poolUsdcDaiFee,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleDai: OPTIMISM.oracleDai,
                curve3Pool: OPTIMISM.curve3Pool,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsSigma'];
