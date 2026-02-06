const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BLAST, COMMON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection, transferETH, getWalletAddress, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");


module.exports = async ({deployments}) => {
    const {save} = deployments;

    if (hre.network.name === 'localhost') {
        await transferETH(1, await getWalletAddress());
    }


    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection('Zerolend', async (strategy) => {
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

module.exports.tags = ['StrategyZerolend'];
