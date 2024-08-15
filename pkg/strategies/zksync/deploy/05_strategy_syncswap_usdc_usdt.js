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

async function getParams() {
    return {
        usdc: ZKSYNC.usdc,
        usdt: ZKSYNC.usdt,
        router: ZKSYNC.syncswapRouter,
        pool: '0x0E595bfcAfb552F83E25d24e8a383F88c1Ab48A4', // USDC/USDT
        oracleUsdc: ZKSYNC.pythOracleUsdc,
        oracleUsdt: ZKSYNC.pythOracleUsdt,
    }
}

module.exports.tags = ['StrategySyncswapUsdcUsdt'];
module.exports.strategySyncswapUsdcUsdtParams = getParams;
