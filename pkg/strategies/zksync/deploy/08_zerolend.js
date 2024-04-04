const { deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { ZKSYNC } = require("@overnight-contracts/common/utils/assets");
const { deploySection, settingSection, transferETH, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");

module.exports = async ({ deployments }) => {
    const { save } = deployments;

    const rewardsWallet = '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46';

    if ( hre.network.name === 'localhost') await transferETH(1, await getWalletAddress());

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection("Zerolend", async (strategy) => {
        await (
            await strategy.setParams({
                usdc: ZKSYNC.usdc,
                z0USDC: ZKSYNC.z0USDC,
                pool: ZKSYNC.zerolendPoolUsdc,
                rewardsController: ZKSYNC.zerolendPoolUsdc,
                earlyZERO: ZKSYNC.earlyZERO,
                rewardsWallet
            })
        ).wait();
    });
};

module.exports.tags = ["StrategyZerolend"];
