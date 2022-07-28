const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {AVALANCHE} = require("@overnight-contracts/common/utils/assets");

let nUsdLPToken = '0xCA87BF3ec55372D9540437d7a86a7750B42C02f4';
let synToken = '0x1f1E7c893855525b303f99bDF5c3c05Be09ca251';
let swap = '0xED2a7edd7413021d440b09D654f3b87712abAB66';
let miniChefV2 = '0x3a01521F8E7F012eB37eAAf1cb9490a5d9e18249';
let pid = 1;


module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

        await (await strategy.setTokens(AVALANCHE.usdc, AVALANCHE.usdce, AVALANCHE.wAvax, nUsdLPToken, synToken)).wait();
        await (await strategy.setParams(swap, miniChefV2, AVALANCHE.platypus, AVALANCHE.traderJoeRouter, pid)).wait();
    });
};

module.exports.tags = ['StrategySynapseUsdce'];
