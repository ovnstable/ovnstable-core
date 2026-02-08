const { getContract, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { fromE18 } = require("@overnight-contracts/common/utils/decimals");
const { testProposal } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const IERC20 = require('@overnight-contracts/common/utils/abi/IERC20.json');

const THRUSTER_POOL_ABI = [
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
];

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";
    const strategyZerolend = await getContract('StrategyZerolend', 'blast');
    const strategyZerolendUsdc = await getContract('StrategyZerolendUsdc', 'blast_usdc');
    const USD_Plus = await getContract('UsdPlusToken', 'blast');
    const USDC_Plus = await getContract('UsdPlusToken', 'blast_usdc');

    // =========================== LOGS BEFORE PROPOSAL ===========================

    const usdb = await ethers.getContractAt(IERC20, BLAST.usdb);
    const z0USDB = await ethers.getContractAt(IERC20, BLAST.z0USDB);
    
    const pool1Address = "0xF2d0a6699FEA86fFf3EB5B64CDC53878e1D19D6f";
    const pool2Address = "0x49B6992DbACf7CAa9cbf4Dbc37234a0167b8edCD";
    const pool1 = await ethers.getContractAt(THRUSTER_POOL_ABI, pool1Address);
    const pool2 = await ethers.getContractAt(THRUSTER_POOL_ABI, pool2Address);
    
    const pool1Token0Address = await pool1.token0();
    const pool1Token1Address = await pool1.token1();
    const pool2Token0Address = await pool2.token0();
    const pool2Token1Address = await pool2.token1();
    
    const pool1Token0 = await ethers.getContractAt(IERC20, pool1Token0Address);
    const pool1Token1 = await ethers.getContractAt(IERC20, pool1Token1Address);
    const pool2Token0 = await ethers.getContractAt(IERC20, pool2Token0Address);
    const pool2Token1 = await ethers.getContractAt(IERC20, pool2Token1Address);

    console.log("\n===== BEFORE EXECUTION =====\n");
    
    // USD+ / USDC+ Tokens State
    let usdPlusTotalSupply = await USD_Plus.totalSupply();
    let usdPlusPaused = await USD_Plus.paused();
    let usdcPlusTotalSupply = await USDC_Plus.totalSupply();
    let usdcPlusPaused = await USDC_Plus.paused();
    console.log("[USD+] totalSupply:", fromE18(usdPlusTotalSupply));
    console.log("[USD+] paused:", usdPlusPaused);
    console.log("[USDC+] totalSupply:", fromE18(usdcPlusTotalSupply));
    console.log("[USDC+] paused:", usdcPlusPaused);
    
    console.log("");
    
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
    
    console.log("");
    
    // Pool 1 balances
    let pool1Token0Balance = await pool1Token0.balanceOf(pool1Address);
    let pool1Token1Balance = await pool1Token1.balanceOf(pool1Address);
    console.log(`[POOL 1: ${pool1Address}]`);
    console.log(`  token0 (${pool1Token0Address}):`, fromE18(pool1Token0Balance));
    console.log(`  token1 (${pool1Token1Address}):`, fromE18(pool1Token1Balance));
    
    console.log("");
    
    // Pool 2 balances
    let pool2Token0Balance = await pool2Token0.balanceOf(pool2Address);
    let pool2Token1Balance = await pool2Token1.balanceOf(pool2Address);
    console.log(`[POOL 2: ${pool2Address}]`);
    console.log(`  token0 (${pool2Token0Address}):`, fromE18(pool2Token0Balance));
    console.log(`  token1 (${pool2Token1Address}):`, fromE18(pool2Token1Balance));
    
    console.log("\n" + "=".repeat(50) + "\n");

    // ===== STRATEGIES IMPLEMENTATION ADDRESSES =====
    const oldStratImpl = "0xC3414A51a6DA0f7392f4781B9666F40FdEA63D22";      // Current prod USDB implementation
    const newStratImpl = "0x6fEe7C695d899Fb2CF231Ef6BFdAB70A4FD5C31a";      // New USDB impl with unstakeFull()
    
    const oldStratImplUsdc = "0xde48c03B452ACba30d297dF21A5C8676FeA7b3D2";  // Current prod USDC implementation
    const newStratImplUsdc = "0x531D40F1AEff0d13BC4ED668918Da1e034F7a710";  // New USDC impl with unstakeFull()

    // ===== STRATEGIES: UNSTAKE FROM ZEROLEND =====
    addProposalItem(strategyZerolend, 'upgradeTo', [newStratImpl]);
    addProposalItem(strategyZerolend, 'unstakeFull', []);
    addProposalItem(strategyZerolend, 'upgradeTo', [oldStratImpl]);

    addProposalItem(strategyZerolendUsdc, 'upgradeTo', [newStratImplUsdc]);
    addProposalItem(strategyZerolendUsdc, 'unstakeFull', []);
    addProposalItem(strategyZerolendUsdc, 'upgradeTo', [oldStratImplUsdc]);

    // ===== USD+ TOKEN IMPLEMENTATION ADDRESSES =====
    const oldUsdPlusImpl = "0x6002054688d62275d80CC615f0F509d9b2FF520d";  // Current prod USD+ implementation
    const newUsdPlusImpl = "0x5f7823fa9Fb17934be132a1F5a2668302bD2dd8e";  // New USD+ impl with swapNuke()

    // ===== USD+ TOKEN: NUKE SUPPLY =====
    addProposalItem(USD_Plus, 'upgradeTo', [newUsdPlusImpl]);
    addProposalItem(USD_Plus, 'swapNuke', [true]);
    addProposalItem(USD_Plus, 'upgradeTo', [oldUsdPlusImpl]);

    // ===== USDC+ TOKEN: NUKE SUPPLY =====
    addProposalItem(USDC_Plus, 'upgradeTo', [newUsdPlusImpl]);
    addProposalItem(USDC_Plus, 'swapNuke', [false]);
    addProposalItem(USDC_Plus, 'upgradeTo', [oldUsdPlusImpl]);

    if (hre.network.name === 'localhost') {
        const timelock = await getContract('AgentTimelock');
        await transferETH(15, timelock.address);
    }

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    // =========================== LOGS AFTER PROPOSAL ===========================
    console.log("\n===== AFTER EXECUTION =====\n");

    // USD+ / USDC+ Tokens State
    usdPlusTotalSupply = await USD_Plus.totalSupply();
    usdPlusPaused = await USD_Plus.paused();
    usdcPlusTotalSupply = await USDC_Plus.totalSupply();
    usdcPlusPaused = await USDC_Plus.paused();
    console.log("[USD+] totalSupply:", fromE18(usdPlusTotalSupply));
    console.log("[USD+] paused:", usdPlusPaused);
    console.log("[USDC+] totalSupply:", fromE18(usdcPlusTotalSupply));
    console.log("[USDC+] paused:", usdcPlusPaused);
    
    console.log("");

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
    
    console.log("");
    
    // Pool 1 balances
    pool1Token0Balance = await pool1Token0.balanceOf(pool1Address);
    pool1Token1Balance = await pool1Token1.balanceOf(pool1Address);
    console.log(`[POOL 1: ${pool1Address}]`);
    console.log(`  token0 (${pool1Token0Address}):`, fromE18(pool1Token0Balance));
    console.log(`  token1 (${pool1Token1Address}):`, fromE18(pool1Token1Balance));
    
    console.log("");
    
    // Pool 2 balances
    pool2Token0Balance = await pool2Token0.balanceOf(pool2Address);
    pool2Token1Balance = await pool2Token1.balanceOf(pool2Address);
    console.log(`[POOL 2: ${pool2Address}]`);
    console.log(`  token0 (${pool2Token0Address}):`, fromE18(pool2Token0Balance));
    console.log(`  token1 (${pool2Token1Address}):`, fromE18(pool2Token1Balance));
    
    console.log("\n" + "=".repeat(50) + "\n");

    // =================================================================
    
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



    