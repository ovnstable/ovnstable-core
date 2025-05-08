const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let poolUsdcOpFee = 500; // 0.05%
let poolUsdcDaiFee = 100; // 0.01%
let rubiconDai = '0x60daec2fc9d2e0de0577a5c708bcadba1458a833';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {
                usdcToken: OPTIMISM.usdc,
                daiToken: OPTIMISM.dai,
                opToken: OPTIMISM.op,
                rubiconDai: rubiconDai,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcOpFee: poolUsdcOpFee,
                poolUsdcDaiFee: poolUsdcDaiFee,
                oracleDai: OPTIMISM.oracleDai,
                oracleUsdc: OPTIMISM.oracleUsdc,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyRubiconDai'];
