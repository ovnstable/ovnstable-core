const { ethers, upgrades } = require("hardhat");
const { transferETH, getWalletAddress, getContract } = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");

/**
 * Force import existing proxy and deploy new implementation
 * 
 * This script:
 * 1. Uses forceImport to register existing proxy in OpenZeppelin manifest
 * 2. Deploys new implementation
 * 
 * Usage:
 *   cd ~/ovnstable-core/pkg/core
 *   STAND=blast node scripts/force_import_and_deploy.js
 */

async function main() {
    const stand = process.env.STAND || hre.ovn?.stand || 'blast';
    
    if (stand !== 'blast' && stand !== 'blast_usdc') {
        console.log(`Skipping for ${stand}`);
        return;
    }
    
    console.log(`\n===== Force Import & Deploy UsdPlusTokenV1 =====`);
    console.log(`Network: ${hre.network.name}`);
    console.log(`Stand: ${stand}\n`);
    
    // Fund wallet on localhost
    if (hre.network.name === "localhost") {
        const walletAddress = await getWalletAddress();
        const balance = await hre.ethers.provider.getBalance(walletAddress);
        if (balance.lt(ethers.utils.parseEther('1'))) {
            console.log('[Localhost] Funding wallet...');
            await transferETH(10, walletAddress);
        }
    }
    
    // Get existing proxy
    const usdPlus = await getContract('UsdPlusToken', stand);
    console.log("Proxy address:", usdPlus.address);
    
    const currentImpl = await getImplementationAddress(ethers.provider, usdPlus.address);
    console.log("Current implementation:", currentImpl);
    
    // Get factory for NEW implementation
    const UsdPlusTokenV1 = await ethers.getContractFactory("contracts/blast/UsdPlusTokenV1.sol:UsdPlusTokenV1");
    
    // Force import existing proxy
    console.log("\nStep 1: Force importing existing proxy...");
    try {
        await upgrades.forceImport(usdPlus.address, UsdPlusTokenV1, {
            kind: 'uups',
        });
        console.log("✅ Proxy imported successfully");
    } catch (e) {
        console.log("⚠️  Import warning:", e.message);
        console.log("Continuing anyway...");
    }
    
    // Deploy new implementation (without upgrading proxy)
    console.log("\nStep 2: Deploying new implementation...");
    
    const sampleModule = require("@openzeppelin/hardhat-upgrades/dist/utils/deploy-impl");
    const impl = await sampleModule.deployProxyImpl(
        hre,
        UsdPlusTokenV1,
        {
            kind: 'uups',
            unsafeSkipStorageCheck: true,
            unsafeAllowRenames: true,
            redeployImplementation: 'always',
        },
        usdPlus.address,
    );
    
    console.log("\n✅ New implementation deployed!");
    console.log("Implementation address:", impl.impl);
    
    console.log("\n=== Next Steps ===");
    console.log("1. Copy implementation address above");
    console.log("2. Update newUsdPlusImpl in proposal script:");
    console.log(`   const newUsdPlusImpl = "${impl.impl}";`);
    console.log("3. Run proposal test");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

