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
        usdt: ARBITRUM.usdt,
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleUsdt: ARBITRUM.oracleUsdt,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        pool: "0xc23F1D198477C0BCaE0Cac2EC734Ceda438A8990",
        npm: "0xe222fbe074a436145b255442d919e4e3a6c6a480",
        lm: "0x7d5ba536ab244aaa1ea42ab88428847f25e3e676",
        fee: 8,
        lowerTick: -5,
        upperTick: 5,
        poolId: 62,
    }
}

module.exports.tags = ['StrategyKyberSwapUsdcUsdt'];
module.exports.getParams = getParams;
module.exports.StrategyKyberSwapUsdcUsdt = getParams;
