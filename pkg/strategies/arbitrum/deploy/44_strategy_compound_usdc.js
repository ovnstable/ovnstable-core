const { deployProxy, deployProxyMulti } = require("@overnight-contracts/common/utils/deployProxy");
const { ARBITRUM, COMMON } = require('@overnight-contracts/common/utils/assets');
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyCompound', deployments, save);
    });

    await settingSection('Compound USDC', async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {

    return {
        usdc: ARBITRUM.usdcCircle,
        comp: ARBITRUM.comp,
        cUsdcV3: ARBITRUM.compoundUsdc,
        compoundRewards: ARBITRUM.compoundRewards,
        rewardWallet: COMMON.rewardWallet,
    }
}



module.exports.tags = ['StrategyCompoundUsdc'];
