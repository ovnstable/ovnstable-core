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
        assetWombat: '0x2977b0B54a76c2b56D32cef19f8ea83Cc766cFD9',
        poolWombat: '0xc6bc781E20f9323012F6e422bdf552Ff06bA6CD1',
        masterWombat: '0x62a83c6791a3d7950d823bb71a38e47252b6b6f4',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0.01% USDT->USDC
        wombexBooster: '0x0A251FA652B59592E60f4bfBce3cD9Cb3d3bd5E9',
        wombexBoosterPid: 0,
        wombexVault: '0xf4cf3521f3122ec620617e37095ced6c974ad133',
        camelorRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyWombatUsdc'];
module.exports.getParams = getParams
module.exports.strategyWombatUsdcParams = getParams
