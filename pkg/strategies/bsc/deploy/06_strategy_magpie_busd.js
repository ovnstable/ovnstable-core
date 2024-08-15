const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

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
        usdc: BSC.usdc,
        busd: BSC.busd,
        usdt: BSC.usdt,
        wBnb: BSC.wBnb,
        wom: BSC.wom,
        mgp: BSC.mgp,
        poolHelperMgp: '0xC4a2B6de728B1E76D2F7178bF8AB3df458dF4C92',
        pancakeRouter: BSC.pancakeRouter,
        pancakeSwapV3Router: BSC.pancakeSwapV3Router,
        oracleBusd: BSC.chainlinkBusd,
        oracleUsdc: BSC.chainlinkUsdc,
    }
}

module.exports.tags = ['StrategyMagpieBusd'];
module.exports.getParams = getParams;
module.exports.strategyMagpieUsdcParams = getParams;
