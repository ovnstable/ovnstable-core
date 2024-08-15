const {deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let rebaseToken = '0xde682E72C52b726e27e2C65ee90a79563780d33e';
let hedgeExchanger = '0xFAc722133a19D38833cc105b1349715717CF050E';
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

module.exports.tags = ['StrategyEtsBetaPlus'];
