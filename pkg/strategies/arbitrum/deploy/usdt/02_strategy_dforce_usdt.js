const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

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
        usdt: ARBITRUM.usdt,
        iUsdt: "0xf52f079Af080C9FB5AFCA57DDE0f8B83d49692a9",
        dForceRewardDistributor: ARBITRUM.dForceRewardDistributor,
        df: ARBITRUM.df,
    }
}

module.exports.tags = ['StrategyDForceUsdt'];
module.exports.strategyDForceUsdtParams = getParams;
