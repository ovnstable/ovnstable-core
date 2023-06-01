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
        usdp: ARBITRUM.usdPlus,
        usdt: ARBITRUM.usdt,
        weth: ARBITRUM.weth,
        wom: ARBITRUM.wom,
        mgp: ARBITRUM.mgp,
        mgpLp: '0x788c4bb90564e62dcd830b246fcfb1aa9e23bfe5',
        stakingWombat: '0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc',
        poolWombat: ARBITRUM.wombatOvnPool,
        wombatRouter: ARBITRUM.wombatRouter,
        masterMgp: '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7',
        poolHelperMgp: '0x22cc1fc61efe23239d3ef6ff0d359019fb599058',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100, //0.01% USDT->USDC
        traderJoeRouter: ARBITRUM.traderJoeRouter,
        camelotRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyMagpieOvnUsdp'];
module.exports.getParams = getParams
module.exports.strategyMagpieOvnUsdpParams = getParams
