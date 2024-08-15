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
        dai: ARBITRUM.dai,
        daiPlus: ARBITRUM.daiPlus,
        usdt: ARBITRUM.usdt,
        usdc: ARBITRUM.usdc,
        weth: ARBITRUM.weth,
        wom: ARBITRUM.wom,
        mgp: ARBITRUM.mgp,
        mgpLp: '0xDccEaf232b9B78cacCde26CC0b8d3566a9cF7202',
        stakingWombat: '0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc',
        poolWombat: ARBITRUM.wombatOvnPool,
        basePoolWombat: ARBITRUM.wombatBasePool,
        routerWombat: ARBITRUM.wombatRouter,
        masterMgp: '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7',
        poolHelperMgp: '0x47D80F77A708df5a5d47BF254148415f9ab1BA96',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100, //0.01% USDT->USDC
        traderJoeRouter: ARBITRUM.traderJoeRouter,
        camelotRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyMagpieOvnDaiPlus'];
module.exports.getParams = getParams
module.exports.strategyMagpieOvnDaiPlusParams = getParams
