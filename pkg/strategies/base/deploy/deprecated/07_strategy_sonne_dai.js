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
        dai: BASE.dai,
        usdbc: BASE.usdbc,
        sonne: BASE.sonne,
        cDai: BASE.sonneDai,
        unitroller: BASE.sonneUnitroller,
        aerodromeRouter: BASE.aerodromeRouter,
        poolSonneUsdbc: '0x554EcA2a48136724294CE47fb7bfE9AADfceE3c6',
        poolUsdbcDai: '0x6EAB8c1B93f5799daDf2C687a30230a540DbD636',
    }
}

module.exports.tags = ['StrategySonneDai'];
module.exports.strategySonneDaiParams = getParams;
