const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BASE} = require("@overnight-contracts/common/utils/assets");

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
        usdbc: BASE.usdbc,
        sonne: BASE.sonne,
        cUsdbc: BASE.sonneUsdbc,
        unitroller: BASE.sonneUnitroller,
        aerodromeRouter: BASE.aerodromeRouter,
        poolSonneUsdbc: '0x554EcA2a48136724294CE47fb7bfE9AADfceE3c6',
    }
}

module.exports.tags = ['StrategySonneUsdbc'];
module.exports.strategySonneUsdbcParams = getParams;
