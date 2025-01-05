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
        poolHelperMgp: '0x1aa1E18FAFAe4391FF33dFBE6198dc84B9541D77',
        pancakeRouter: BSC.pancakeRouter,
        pancakeSwapV3Router: BSC.pancakeSwapV3Router
    }
}

module.exports.tags = ['StrategyMagpieUsdt'];
module.exports.getParams = getParams;
module.exports.strategyMagpieUsdcParams = getParams;
