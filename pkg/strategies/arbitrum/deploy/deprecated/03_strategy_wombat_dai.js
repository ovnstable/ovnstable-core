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
        usdt: ARBITRUM.usdt,
        usdc: ARBITRUM.usdc,
        wom: ARBITRUM.wom,
        wmx: ARBITRUM.wmx,
        assetWombat: '0x0fa7b744f18d8e8c3d61b64b110f25cc27e73055',
        poolWombat: '0xc6bc781e20f9323012f6e422bdf552ff06ba6cd1',
        masterWombat: '0x62a83c6791a3d7950d823bb71a38e47252b6b6f4',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0.01% USDT->DAI
        wombexBooster: '0x0A251FA652B59592E60f4bfBce3cD9Cb3d3bd5E9',
        wombexBoosterPid: 2,
        wombexVault: '0xceb079acf18fef334a7c094a8c2ed945df516183',
        camelorRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyWombatDai'];
module.exports.getParams = getParams
module.exports.strategyWombatDaiParams = getParams
