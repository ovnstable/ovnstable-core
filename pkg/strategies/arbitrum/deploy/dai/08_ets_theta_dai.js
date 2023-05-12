const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyEtsDaiUsdt', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        dai: ARBITRUM.dai,
        usdt: ARBITRUM.usdt,
        rebaseToken: "0x516C8dB22c0CE29A7dE6d4010ED64230d5b7124C",
        hedgeExchanger: "0xE711c1273C1d5a1Ca1A7c9e0EC8e14B270621711",
        oracleDai: ARBITRUM.oracleDai,
        oracleUsdt: ARBITRUM.oracleUsdt,
        gmxRouter: ARBITRUM.gmxRouter,
        gmxVault: ARBITRUM.gmxVault,
        gmxReader: ARBITRUM.gmxReader,
        wombatRouter: ARBITRUM.wombatRouter,
        wombatBasePool: ARBITRUM.wombatBasePool,
    };
}

module.exports.tags = ['StrategyEtsThetaDai'];
module.exports.getParams = getParams;
module.exports.strategyEtsThetaDai = getParams;
