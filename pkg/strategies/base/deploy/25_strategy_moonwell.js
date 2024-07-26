const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BASE} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: BASE.usdc,
        well: BASE.well,
        weth: BASE.weth,
        mUsdc: BASE.moonwellUsdc,
        unitroller: BASE.moonwellUnitroller,
        aerodromeRouter: BASE.aerodromeRouter
    }
}

module.exports.tags = ['StrategyMoonwell'];
module.exports.strategyMoonwellParams = getParams;
