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
        weth: ARBITRUM.weth,
        wom: ARBITRUM.wom,
        mgp: '0xa61F74247455A40b01b0559ff6274441FAfa22A3',
        mgpLp: '0xd3a4CfbeE618F51443213a1751Aa5C6208e6be11',
        stakingWombat: '0x3CbFC97f87f534b42bb58276B7b5dCaD29E57EAc',
        poolWombat: '0xc6bc781e20f9323012f6e422bdf552ff06ba6cd1',
        masterMgp: '0x664cc2bcae1e057eb1ec379598c5b743ad9db6e7',
        poolHelperMgp: '0x193F9e182700b5eA8e86a2f0a98401df3F396f39',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0,.01% USDT->USDC
        traderJoeRouter: ARBITRUM.traiderJoeRouter
    }
}

module.exports.tags = ['StrategyMagpieDai'];
module.exports.getParams = getParams
module.exports.strategyMagpieDaiParams = getParams
