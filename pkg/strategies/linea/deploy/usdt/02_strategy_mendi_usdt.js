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
        usdt: LINEA.usdt,
        usdc: LINEA.usdc,
        mendi: LINEA.mendi,
        cUsdt: LINEA.mendiUsdt,
        unitroller: LINEA.mendiUnitroller,
        velocoreVault: LINEA.velocoreVault,
        poolMendiUsdc: '0xd0E67CE5E72beBA9D0986479Ea4E4021120cf794',
        poolUsdcDaiUsdt: '0x131d56758351c9885862ada09a6a7071735c83b3',
    }
}

module.exports.tags = ['StrategyMendiUsdt'];
module.exports.strategyMendiUsdtParams = getParams;
