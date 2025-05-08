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
        wom: ARBITRUM.wom,
        wmx: ARBITRUM.wmx,
        assetWombat: '0x6ADd078996308547C57B052549a19c5f66BF42C8',
        poolWombat: ARBITRUM.wombatOvnPool,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0.01% USDT->USDC
        wombexBooster: "0x0A251FA652B59592E60f4bfBce3cD9Cb3d3bd5E9",
        wombexBoosterPid: 11,
        wombexVault: '0x28df708bc28bd29c41fb9e0002453c333086ffc1',
        camelotRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyWombatOvnUsdc'];
module.exports.getParams = getParams
module.exports.strategyWombatOvnUsdcParams = getParams
