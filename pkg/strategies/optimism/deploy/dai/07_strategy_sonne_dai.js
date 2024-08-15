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
        dai: OPTIMISM.dai,
        usdc: OPTIMISM.usdc,
        sonne: OPTIMISM.sonne,
        cDai: OPTIMISM.soDai,
        unitroller: OPTIMISM.unitroller,
        velodromeRouter: OPTIMISM.velodromeRouterV2,
        poolSonneUsdc: '0x4E60495550071693bc8bDfFC40033d278157EAC7',
        poolUsdcDai: '0x19715771E30c93915A5bbDa134d782b81A820076',
    }
}

module.exports.tags = ['StrategySonneDai'];
module.exports.strategySonneDaiParams = getParams;
