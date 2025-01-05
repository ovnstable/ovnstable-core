const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

let poolUsdcDaiFee = 100; // 0.01%
let gainsVault = '0xd7052EC0Fe1fe25b20B7D65F6f3d490fCE58804f';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setParams(
            {
                usdc: POLYGON.usdc,
                dai: POLYGON.dai,
                gainsVault: gainsVault,
                uniswapV3Router: POLYGON.uniswapV3Router,
                poolUsdcDaiFee: poolUsdcDaiFee,
                oracleDai: POLYGON.oracleChainlinkDai,
                oracleUsdc: POLYGON.oracleChainlinkUsdc,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyGainsDai'];
