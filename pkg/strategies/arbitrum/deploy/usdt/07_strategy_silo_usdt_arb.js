const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ZKSYNC, BASE, ARBITRUM} = require("@overnight-contracts/common/utils/assets");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategySiloUsdtUsdc', deployments, save);
    });

    await settingSection('Silo USDT/ARB', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams(){

    return {
        usdc: ARBITRUM.usdc,
        usdt: ARBITRUM.usdt,
        inchSwapper: ARBITRUM.inchSwapper,
        silo: "0x0696E6808EE11a5750733a3d821F9bB847E584FB", // ARB, ETH, USDC.e
        siloIncentivesController: "0x7e5BFBb25b33f335e34fa0d78b878092931F8D20",
        siloTower: "0x4182ad1513446861Be314c30DB27C67473541457",
        siloToken: ARBITRUM.silo,
        wethToken: ARBITRUM.weth,
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        oracleUsdc: ARBITRUM.oracleUsdc,
        oracleUsdt: ARBITRUM.oracleUsdt,
    }

}

module.exports.tags = ['StrategySiloUsdtArb'];
module.exports.strategySiloUsdtArb = getParams
