const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM, OPTIMISM} = require("@overnight-contracts/common/utils/assets");

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
        usdc: OPTIMISM.usdc,
        usdt: OPTIMISM.usdt,
        oracleUsdc: OPTIMISM.oracleUsdc,
        oracleUsdt: OPTIMISM.oracleUsdt,
        uniswapV3Router: OPTIMISM.uniswapV3Router,
        pool: "0x9766B7fA623A65dFe56D9788c2D39AB4718c80A6",
        npm: "0xe222fbe074a436145b255442d919e4e3a6c6a480",
        lm: "0x7d5ba536ab244aaa1ea42ab88428847f25e3e676",
        fee: 8,
        lowerTick: -5,
        upperTick: 5,
        poolId: 29,
    }
}

module.exports.tags = ['StrategyKyberSwapUsdcUsdt'];
module.exports.getParams = getParams;
module.exports.StrategyKyberSwapUsdcUsdt = getParams;
