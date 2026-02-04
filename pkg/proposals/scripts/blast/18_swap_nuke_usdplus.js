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

    const usdPlus = await getContract('UsdPlusToken', 'blast');
    
    const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";

    // ===== LOGS BEFORE =====
    console.log("\n===== BEFORE EXECUTION =====\n");
    
    // External wallet balance
    let usdbBalanceWal = await usdb.balanceOf(wal);
    console.log("[WALLET] usdb balance:", fromE18(usdbBalanceWal));
    
    console.log("");
    
    // USD+ Token
    let totalSupply = await usdPlus.totalSupply();
    console.log("[USD+] totalSupply:", fromE18(totalSupply));
    let liquidityIndex = await usdPlus.liquidityIndex();
    console.log("[USD+] liquidityIndex:", liquidityIndex.toString());
    
    console.log("");

    // ===== USD+ TOKEN IMPLEMENTATION ADDRESSES =====
    const oldUsdPlusImpl = "0x6002054688d62275d80CC615f0F509d9b2FF520d";  // Current prod USD+ implementation
    const newUsdPlusImpl = "0x3F18c87dc965ca8F5aB580Fc7F8446bCDb2E58a5";  // New USD+ impl with nukeSupply()

    // ===== USD+ TOKEN: NUKE SUPPLY =====
    addProposalItem(usdPlus, 'upgradeTo', [newUsdPlusImpl]);
    addProposalItem(usdPlus, 'nukeSupply', []);
    addProposalItem(usdPlus, 'upgradeTo', [oldUsdPlusImpl]);

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    // ===== LOGS AFTER =====
    console.log("\n===== AFTER EXECUTION =====\n");
    
    // External wallet balance
    usdbBalanceWal = await usdb.balanceOf(wal);
    console.log("[WALLET] usdb balance:", fromE18(usdbBalanceWal));
    
    console.log("");
    
    // USD+ Token
    totalSupply = await usdPlus.totalSupply();
    console.log("[USD+] totalSupply:", fromE18(totalSupply));
    liquidityIndex = await usdPlus.liquidityIndex();
    console.log("[USD+] liquidityIndex:", liquidityIndex.toString());
        
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



    