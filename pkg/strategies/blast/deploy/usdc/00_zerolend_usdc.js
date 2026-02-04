const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BLAST, COMMON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        // Skip storage check on localhost fork (old implementation not in cache)
        const params = hre.network.name === "localhost" 
            ? { unsafeSkipStorageCheck: true }
            : {};
        await deployProxy(name, deployments, save, params);
    });

    await settingSection('Zerolend USDC', async (strategy) => {
        await (await strategy.setParams(
            {
                usdb: BLAST.usdb,
                z0USDB: BLAST.z0USDB,
                pool: BLAST.zerolendPoolUsdb,
                rewardsController: BLAST.zerolandRewardsController,
                earlyZERO: BLAST.earlyZERO,
                rewardsWallet: COMMON.rewardWallet
            }
        )).wait();
    });

};

module.exports.tags = ['StrategyZerolendUsdc'];
