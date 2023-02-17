const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0x3A3AE3313959e102Fb1A66678b0B3FcfC40D8742';
let hedgeExchanger = '0xb9a141545295c26d78E3C87E804befE69D029De5';
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
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEtsTheta'];
