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
        wom: ARBITRUM.wom,
        wmx: ARBITRUM.wmx,
        assetWombat: '0x51E073D92b0c226F7B0065909440b18A85769606', // Asset DAI+
        poolWombat: ARBITRUM.wombatOvnPool,
        basePoolWombat: ARBITRUM.wombatBasePool,
        wombatRouter: ARBITRUM.wombatRouter,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0.01% USDT->DAI
        wombexBooster: "0x0A251FA652B59592E60f4bfBce3cD9Cb3d3bd5E9",
        wombexBoosterPid: 10,
        wombexVault: '0x7febe9b6b1f48b4e8c7e7c2f2b0923111533158b', // Wombex DAI+
        camelotRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyWombatOvnDaiPlus'];
module.exports.getParams = getParams
module.exports.strategyWombatOvnDaiPlusParams = getParams
