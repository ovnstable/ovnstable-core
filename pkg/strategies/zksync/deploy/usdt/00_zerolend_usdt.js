const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ZKSYNC, COMMON } = require("@overnight-contracts/common/utils/assets");
const { deploySection, settingSection, transferETH, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    if ( hre.network.name === 'localhost') await transferETH(1, await getWalletAddress());
     
    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });  

    await settingSection("ZerolendUsdt", async (strategy) => {
        await (
            await strategy.setParams({
                usdt: ZKSYNC.usdt,
                z0USDT: ZKSYNC.z0USDT,
                pool: ZKSYNC.zerolendPoolUsdt,
                rewardsController: ZKSYNC.zerolendRewardsController,
                earlyZERO: ZKSYNC.earlyZERO,
                rewardsWallet: COMMON.rewardWallet
            })
        ).wait();
    });
};

module.exports.tags = ["StrategyZerolendUsdt"];
