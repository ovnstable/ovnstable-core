const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { BASE } = require("@overnight-contracts/common/utils/assets");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('', async (strategy) => {
        await (await strategy.setSimulationParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        factory: BASE.aerodromeFactory,
    }
}

module.exports.tags = ['AeroSwap'];
module.exports.aeroSwapParams = getParams;
