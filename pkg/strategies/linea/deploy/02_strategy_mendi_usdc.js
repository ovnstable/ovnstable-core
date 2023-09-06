const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {LINEA} = require("@overnight-contracts/common/utils/assets");

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
        usdc: LINEA.usdc,
        mendi: LINEA.mendi,
        cUsdc: LINEA.mendiUsdc,
        unitroller: LINEA.mendiUnitroller,
        velocoreVault: LINEA.velocoreVault,
        poolMendiUsdc: '0xd0E67CE5E72beBA9D0986479Ea4E4021120cf794',
    }
}

module.exports.tags = ['StrategyMendiUsdc'];
module.exports.strategyMendiUsdcParams = getParams;
