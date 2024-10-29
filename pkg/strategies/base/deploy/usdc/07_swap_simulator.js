const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {ZKSYNC, BASE} = require("@overnight-contracts/common/utils/assets");
const { factory } = require("typescript");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    let wallet = await initWallet();

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setSimulationParams(await getParams(), {gasPrice: 4221834})).wait();
    }, wallet);
};

async function getParams() {
    return {
        // strategy: "0xcc9c1edae4D3b8d151Ebc56e749aD08b09f50248", 
        strategy: wallet.address, // for tests
        factory: BASE.aerodromeNpm
    };
}

module.exports.tags = ['SwapSimulatorAerodrome'];
module.exports.swapSimulatorAerodrome = getParams;
