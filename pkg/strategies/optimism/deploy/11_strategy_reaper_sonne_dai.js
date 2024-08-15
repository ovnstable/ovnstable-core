const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let soDai = '0xC66b447BE01Ae5FEadBd6DC76D228c5143af9A3C';
let poolUsdcDaiFee = 100; // 0.01%

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
                soDai: soDai,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleDai: OPTIMISM.oracleDai,
                uniswapV3Router: OPTIMISM.uniswapV3Router,
                poolUsdcDaiFee: poolUsdcDaiFee,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyReaperSonneDai'];
