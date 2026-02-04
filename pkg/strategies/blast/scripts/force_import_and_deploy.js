const { ethers, upgrades } = require("hardhat");
const { transferETH, getWalletAddress, getContract } = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");

/**
 * Force import existing proxy and deploy new implementation for strategies
 * 
 * Usage:
 *   cd ~/ovnstable-core/pkg/strategies/blast
 *   STAND=blast STRATEGY=StrategyZerolend node scripts/force_import_and_deploy.js
 *   STAND=blast_usdc STRATEGY=StrategyZerolendUsdc node scripts/force_import_and_deploy.js
 */

async function main() {
    const stand = process.env.STAND || hre.ovn?.stand;
    const strategyName = process.env.STRATEGY;
    
    if (!strategyName) {
        console.error("ERROR: STRATEGY environment variable is required");
        console.log("\nUsage:");
        console.log("  STAND=blast STRATEGY=StrategyZerolend node scripts/force_import_and_deploy.js");
        console.log("  STAND=blast_usdc STRATEGY=StrategyZerolendUsdc node scripts/force_import_and_deploy.js");
        process.exit(1);
    }
    
    console.log(`\n===== Force Import & Deploy ${strategyName} =====`);
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
    const strategy = await getContract(strategyName, stand);
    console.log("Proxy address:", strategy.address);
    
    const currentImpl = await getImplementationAddress(ethers.provider, strategy.address);
    console.log("Current implementation:", currentImpl);
    
    // Determine contract path
    let contractPath;
    if (strategyName === "StrategyZerolendUsdc") {
        contractPath = "contracts/usdc/StrategyZerolendUsdc.sol:StrategyZerolendUsdc";
    } else {
        contractPath = `contracts/${strategyName}.sol:${strategyName}`;
    }
    
    // Get factory for NEW implementation
    console.log("Contract path:", contractPath);
    const StrategyFactory = await ethers.getContractFactory(contractPath);
    
    // Force import existing proxy
    console.log("\nStep 1: Force importing existing proxy...");
    try {
        await upgrades.forceImport(strategy.address, StrategyFactory, {
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
        StrategyFactory,
        {
            kind: 'uups',
            unsafeSkipStorageCheck: true,
            unsafeAllowRenames: true,
            redeployImplementation: 'always',
        },
        strategy.address,
    );
    
    console.log("\n✅ New implementation deployed!");
    console.log("Implementation address:", impl.impl);
    
    console.log("\n=== Next Steps ===");
    console.log("1. Copy implementation address above");
    console.log("2. Update implementation address in proposal script");
    console.log("3. Run proposal test");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

