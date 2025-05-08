const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BASE, OPTIMISM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdc: OPTIMISM.usdc,
        sonne: OPTIMISM.sonne,
        cUsdc: OPTIMISM.soUsdc,
        unitroller: OPTIMISM.unitroller,
        velodromeRouter: OPTIMISM.velodromeRouterV2,
        poolSonneUsdc: '0x4E60495550071693bc8bDfFC40033d278157EAC7',
    }
}

module.exports.tags = ['StrategySonneUsdc'];
module.exports.strategySonneUsdcParams = getParams;
