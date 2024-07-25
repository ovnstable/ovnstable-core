const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ZKSYNC, BASE, ARBITRUM, COMMON} = require("@overnight-contracts/common/utils/assets");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('Silo ETH', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams(){

    return {
        eth: ARBITRUM.weth,
        silo: "0xA8897b4552c075e884BDB8e7b704eB10DB29BF0D", // wstETH, ETH, USDC.e
        siloIncentivesController: "0x7e5BFBb25b33f335e34fa0d78b878092931F8D20",
        siloTower: "0x4182ad1513446861Be314c30DB27C67473541457",
        siloToken: ARBITRUM.silo,
        arbToken: ARBITRUM.arb,
        rewardWallet: COMMON.rewardWallet,
        camelotRouter: ARBITRUM.camelotRouter,
        distributor: '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae',
    }

}

module.exports.tags = ['StrategySiloEth'];
module.exports.strategySiloEth = getParams
