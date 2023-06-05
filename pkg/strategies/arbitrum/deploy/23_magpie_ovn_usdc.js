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
        mgpLp: '0x3F629aC8ce165DEfAd238C53aE5dB4D9abA38451',
        stakingWombat: '0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc',
        poolWombat: ARBITRUM.wombatOvnPool,
        masterMgp: '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7',
        poolHelperMgp: '0xa2bbe73bd596d1914142196162b2ae9830e57f66',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100, //0.01% USDT->USDC
        traderJoeRouter: ARBITRUM.traderJoeRouter,
        camelotRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyMagpieOvnUsdc'];
module.exports.getParams = getParams
module.exports.strategyMagpieOvnUsdcParams = getParams
