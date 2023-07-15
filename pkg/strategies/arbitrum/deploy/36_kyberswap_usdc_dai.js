const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: ARBITRUM.usdc,
        dai: ARBITRUM.dai,
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleDai: ARBITRUM.oracleDai,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        pool: "0x29ac9738Be0D1f7CBa31d7FF67baf5fdd164EFC6",
        npm: "0xe222fbe074a436145b255442d919e4e3a6c6a480",
        lm: "0x7d5ba536ab244aaa1ea42ab88428847f25e3e676",
        fee: 8,
        lowerTick: -276329,
        upperTick: 	-276319,
        poolId: 38,
    }
}

module.exports.tags = ['StrategyKyberSwapUsdcDai'];
module.exports.getParams = getParams;
module.exports.StrategyKyberSwapUsdcDai = getParams;
