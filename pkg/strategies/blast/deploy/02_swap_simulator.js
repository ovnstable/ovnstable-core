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
        strategy: "0xe1201f02C02e468c7fF6F61AFff505A859673cfD", 
        // strategy: wallet.address, // for tests
        factory: '0xa08ae3d3f4da51c22d3c041e468bdf4c61405aab'
    };
}

module.exports.tags = ['SwapSimulatorThruster'];
module.exports.swapSimulatorThruster = getParams;