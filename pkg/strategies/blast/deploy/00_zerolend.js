const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BLAST, COMMON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection, transferETH, getWalletAddress, getPrice, getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

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
        // Force import on localhost to avoid "not registered" error
        if (hre.network.name === "localhost" && hre.ovn && hre.ovn.impl) {
            console.log('[Localhost] Force importing existing proxy...');
            
            try {
                const strategy = await getContract(name, 'blast');
                const factory = await ethers.getContractFactory(name);
                await upgrades.forceImport(strategy.address, factory, { 
                    kind: 'uups',
                });
                console.log('[Localhost] ✅ Proxy imported successfully');
            } catch (e) {
                console.log('[Localhost] ⚠️  Force import warning:', e.message);
            }
        }
        
        // Deploy with unsafe flags on localhost
        const params = (hre.network.name === "localhost") 
            ? { unsafeSkipStorageCheck: true, unsafeAllowRenames: true }
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
