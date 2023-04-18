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
        assetWombat: '0x85cEBD962861be410a777755dFa06914de6af003',
        poolWombat: '0xc6bc781e20f9323012f6e422bdf552ff06ba6cd1',
        masterWombat: '0x62a83c6791a3d7950d823bb71a38e47252b6b6f4',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        poolFee0: 3000, //0.3% WOM->USDT
        poolFee1: 100,   //0.01% USDT->USDC
        curvePool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353', // Curve.fi USDC/USDT (2CRV)
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleUsdt: ARBITRUM.oracleUsdt,
        wombexBooster: '0x4181E561b42fDaD14c68b0794c215DeB9Bc80c8F',
        wombexBoosterPid: 1,
        wombexVault: '0x519ccE4f10658AA71D138E67BCeb39bA05Bd01D5',
        camelorRouter: ARBITRUM.camelotRouter
    }
}

module.exports.tags = ['StrategyWombatUsdt'];
module.exports.getParams = getParams
module.exports.strategyWombatUsdtParams = getParams
