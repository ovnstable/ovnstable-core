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
        mgp: '0xa61F74247455A40b01b0559ff6274441FAfa22A3',
        mgpLp: '0x72aA7a1b3fB43e6c3C83DC31DA0d4099B475A47A',
        stakingWombat: '0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc',
        poolWombat: '0xc6bc781E20f9323012F6e422bdf552Ff06bA6CD1',
        masterMgp: '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7',
        poolHelperMgp: '0x6b962d671ea7ff73c0eced4269fc27a1e326c759',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0,.01% USDT->USDC
        traderJoeRouter: ARBITRUM.traiderJoeRouter
    }
}

module.exports.tags = ['StrategyMagpieUsdc'];
module.exports.getParams = getParams
module.exports.strategyMagpieUsdcParams = getParams
