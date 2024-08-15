const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
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
        weth: ARBITRUM.weth,
        wom: ARBITRUM.wom,
        mgp: ARBITRUM.mgp,
        mgpLp: '0xF563200Ff355661Bac6f190EfB6CF97831776F0f',
        stakingWombat: '0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc',
        poolWombat: '0xc6bc781E20f9323012F6e422bdf552Ff06bA6CD1',
        masterMgp: '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7',
        poolHelperMgp: '0x62A41a55E7B6ae3eE1c178DaF17d72E11bA86015',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        traderJoeRouter: ARBITRUM.traderJoeRouter,
        camelotRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyMagpieUsdt'];
module.exports.getParams = getParams
module.exports.strategyMagpieUsdcParams = getParams
