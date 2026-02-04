const { getContract, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { fromE18 } = require("@overnight-contracts/common/utils/decimals");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');


async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    const strategyZerolend = await getContract('StrategyZerolend', 'blast');
    const strategyZerolendUsdc = await getContract('StrategyZerolendUsdc', 'blast_usdc');
    const usdPlus = await getContract('UsdPlusToken', 'blast');
    
    const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";
    const usdb = await ethers.getContractAt(IERC20, BLAST.usdb);
    const z0USDB = await ethers.getContractAt(IERC20, BLAST.z0USDB);

    // ===== LOGS BEFORE =====
    console.log("\n===== BEFORE EXECUTION =====\n");
    
    // External wallet balance
    let usdbBalanceWal = await usdb.balanceOf(wal);
    console.log("[WALLET] usdb balance:", fromE18(usdbBalanceWal));
    
    console.log("");
    
    // USDB Strategy
    let z0USDBBalanceStrategy = await z0USDB.balanceOf(strategyZerolend.address);
    console.log("[USD STRATEGY] z0USDB balance:", fromE18(z0USDBBalanceStrategy));
    let usdbBalanceStrategy = await usdb.balanceOf(strategyZerolend.address);
    console.log("[USD STRATEGY] usdb balance:", fromE18(usdbBalanceStrategy));
    let NAV_usd = await strategyZerolend.netAssetValue();
    console.log("[USD STRATEGY] NAV:", fromE18(NAV_usd));
    
    console.log("");
    
    // USDC Strategy (uses same tokens - usdb/z0USDB)
    let z0USDBBalanceStrategyUsdc = await z0USDB.balanceOf(strategyZerolendUsdc.address);
    console.log("[USDC STRATEGY] z0USDB balance:", fromE18(z0USDBBalanceStrategyUsdc));
    let usdbBalanceStrategyUsdc = await usdb.balanceOf(strategyZerolendUsdc.address);
    console.log("[USDC STRATEGY] usdb balance:", fromE18(usdbBalanceStrategyUsdc));
    let NAV_usdc = await strategyZerolendUsdc.netAssetValue();
    console.log("[USDC STRATEGY] NAV:", fromE18(NAV_usdc));
    
    console.log("\n" + "=".repeat(50) + "\n");

    // ===== STRATEGIES IMPLEMENTATION ADDRESSES =====
    const oldStratImpl = "0xC3414A51a6DA0f7392f4781B9666F40FdEA63D22";      // Current prod USDB implementation
    const newStratImpl = "0x3F18c87dc965ca8F5aB580Fc7F8446bCDb2E58a5";      // New USDB impl with unstakeFull()
    
    const oldStratImplUsdc = "0xde48c03B452ACba30d297dF21A5C8676FeA7b3D2";  // Current prod USDC implementation
    const newStratImplUsdc = "0x5f7823fa9Fb17934be132a1F5a2668302bD2dd8e";  // New USDC impl with unstakeFull()

    // ===== STRATEGIES: UNSTAKE FROM ZEROLEND =====
    addProposalItem(strategyZerolend, 'upgradeTo', [newStratImpl]);
    addProposalItem(strategyZerolend, 'unstakeFull', []);
    addProposalItem(strategyZerolend, 'upgradeTo', [oldStratImpl]);

    addProposalItem(strategyZerolendUsdc, 'upgradeTo', [newStratImplUsdc]);
    addProposalItem(strategyZerolendUsdc, 'unstakeFull', []);
    addProposalItem(strategyZerolendUsdc, 'upgradeTo', [oldStratImplUsdc]);

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    // ===== LOGS AFTER =====
    console.log("\n===== AFTER EXECUTION =====\n");
    
    // External wallet balance
    usdbBalanceWal = await usdb.balanceOf(wal);
    console.log("[WALLET] usdb balance:", fromE18(usdbBalanceWal));
    
    console.log("");
    
    // USDB Strategy
    NAV_usd = await strategyZerolend.netAssetValue();
    console.log("[USD STRATEGY] NAV:", fromE18(NAV_usd));
    z0USDBBalanceStrategy = await z0USDB.balanceOf(strategyZerolend.address);
    console.log("[USD STRATEGY] z0USDB balance:", fromE18(z0USDBBalanceStrategy));
    usdbBalanceStrategy = await usdb.balanceOf(strategyZerolend.address);
    console.log("[USD STRATEGY] usdb balance:", fromE18(usdbBalanceStrategy));
    
    console.log("");
    
    // USDC Strategy
    NAV_usdc = await strategyZerolendUsdc.netAssetValue();
    console.log("[USDC STRATEGY] NAV:", fromE18(NAV_usdc));
    z0USDBBalanceStrategyUsdc = await z0USDB.balanceOf(strategyZerolendUsdc.address);
    console.log("[USDC STRATEGY] z0USDB balance:", fromE18(z0USDBBalanceStrategyUsdc));
    usdbBalanceStrategyUsdc = await usdb.balanceOf(strategyZerolendUsdc.address);
    console.log("[USDC STRATEGY] usdb balance:", fromE18(usdbBalanceStrategyUsdc));
    
    console.log("\n" + "=".repeat(50) + "\n");
    
    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });



    