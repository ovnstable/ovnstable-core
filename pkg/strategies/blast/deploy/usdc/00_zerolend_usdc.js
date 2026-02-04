const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {BLAST, COMMON} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection, getContract} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { ethers, upgrades } = require("hardhat");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        // Force import on localhost to avoid "not registered" error
        if (hre.network.name === "localhost" && hre.ovn && hre.ovn.impl) {
            console.log('[Localhost] Force importing existing proxy...');
            
            try {
                const strategy = await getContract(name, 'blast_usdc');
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
