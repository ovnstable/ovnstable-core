const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ZKSYNC} = require("@overnight-contracts/common/utils/assets");


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
        usdc: ZKSYNC.usdc,
        usdp: ZKSYNC.usdPlus,
        vc: ZKSYNC.vc,
        router: ZKSYNC.velocoreRouter,
        gauge: '0x4926b61510F086eBa77b374B5689A4DB370c2933',
        pair: '0x4b9f00860d7f42870addeb687fa4e47062df71d9', // USDC/USD+
    }

}

module.exports.tags = ['StrategyVelocoreUsdcUsdPlus'];
module.exports.strategyVelocoreUsdcUsdPlus = getParams
