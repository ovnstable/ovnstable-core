const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ZKSYNC, BASE, ARBITRUM} = require("@overnight-contracts/common/utils/assets");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams(){

    return {
        usdc: ARBITRUM.usdc,
        silo: "0xA8897b4552c075e884BDB8e7b704eB10DB29BF0D", // wstETH, ETH, USDC.e
        siloIncentivesController: "0xd592F705bDC8C1B439Bd4D665Ed99C4FaAd5A680",
        siloTower: "0x4182ad1513446861Be314c30DB27C67473541457",
        siloToken: ARBITRUM.silo,
        wethToken: ARBITRUM.weth,
        camelotRouter: ARBITRUM.camelotRouter,
    }

}

module.exports.tags = ['StrategySiloUsdc'];
module.exports.strategySiloUsdc = getParams
