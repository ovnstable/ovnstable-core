const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BLAST, COMMON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection, transferETH, getWalletAddress, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    // Fund wallet on localhost fork
    if (hre.network.name === 'localhost') {
        const walletAddress = await getWalletAddress();
        const balance = await hre.ethers.provider.getBalance(walletAddress);
        const minBalance = hre.ethers.utils.parseEther('1');
        
        if (balance.lt(minBalance)) {
            console.log(`[Localhost] Wallet balance low (${hre.ethers.utils.formatEther(balance)} ETH), funding...`);
            await transferETH(10, walletAddress);
            console.log(`[Localhost] Funded wallet with 10 ETH`);
        }
    }


    await deploySection(async (name) => {
        // Skip storage check on localhost fork (old implementation not in cache)
        const params = hre.network.name === "localhost" 
            ? { unsafeSkipStorageCheck: true }
            : {};
        await deployProxy(name, deployments, save, params);
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
