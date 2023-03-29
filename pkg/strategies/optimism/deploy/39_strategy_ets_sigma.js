const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '';
let hedgeExchanger = '';

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
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsSigma'];
