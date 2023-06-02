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
        poolHelperMgp: '0xb68F5247f31fe28FDe0b0F7543F635a4d6EDbD7F',
        pancakeRouter: BSC.pancakeRouter,
        pancakeSwapV3Router: BSC.pancakeSwapV3Router
    }
}

module.exports.tags = ['StrategyMagpieUsdc'];
module.exports.getParams = getParams;
module.exports.strategyMagpieUsdcParams = getParams;
