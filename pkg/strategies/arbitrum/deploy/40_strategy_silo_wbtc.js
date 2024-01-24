const {deployProxy, deployProxyMulti} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ZKSYNC, BASE, ARBITRUM} = require("@overnight-contracts/common/utils/assets");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategySiloUsdc', deployments, save);
    });

    await settingSection('Silo USDC/WBTC', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams(){

    return {
        usdc: ARBITRUM.usdc,
        silo: "0x69eC552BE56E6505703f0C861c40039e5702037A", // WBTC, ETH, USDC.e
        siloIncentivesController: "0xd592F705bDC8C1B439Bd4D665Ed99C4FaAd5A680",
        siloTower: "0x4182ad1513446861Be314c30DB27C67473541457",
        siloToken: ARBITRUM.silo,
        wethToken: ARBITRUM.weth,
        camelotRouter: ARBITRUM.camelotRouter,
    }

}

module.exports.tags = ['StrategySiloUsdcWbtc'];
module.exports.strategySiloUsdcWbtc = getParams
