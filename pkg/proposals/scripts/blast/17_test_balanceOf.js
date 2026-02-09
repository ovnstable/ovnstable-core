const { getContract, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const { testProposal, createProposal } = require("@overnight-contracts/common/utils/governance");
const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));
const hre = require("hardhat");
const { fromE18 } = require("@overnight-contracts/common/utils/decimals");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    const wal = "0xbdc36da8fD6132e5F5179a73b3A1c0E9fF283856";
    const USD_Plus = await getContract('UsdPlusToken', 'blast');

    const pair1 = "0x421a018cC5839c4C0300AfB21C725776dc389B1a";
    const pair2 = "0x6c51df2275af37c407148e913B5396896E7E8E9e";
    const pair3 = "0x1A5FEBA5D5846B3b840312Bd04D76ddaa6220170";

    // ===== USD+ TOKEN IMPLEMENTATION ADDRESSES =====
    const finalUsdPlusImpl = "0x338D0cE61a5AC9EfBb2d6632743953FFF225444F";  // Current prod USD+ implementation
    const tmpUsdPlusImpl = "0x3F18c87dc965ca8F5aB580Fc7F8446bCDb2E58a5";  // New USD+ impl with swapNuke()

    console.log("\n===== BEFORE EXECUTION =====\n");
    
    const balanceWalBefore = await USD_Plus.balanceOf(wal);
    const balancePair1Before = await USD_Plus.balanceOf(pair1);
    const balancePair2Before = await USD_Plus.balanceOf(pair2);
    const balancePair3Before = await USD_Plus.balanceOf(pair3);
    
    console.log(`[WALLET] USD+ balance: ${fromE18(balanceWalBefore)} USD+`);
    console.log(`[PAIR1] USD+ balance: ${fromE18(balancePair1Before)} USD+`);
    console.log(`[PAIR2] USD+ balance: ${fromE18(balancePair2Before)} USD+`);
    console.log(`[PAIR3] USD+ balance: ${fromE18(balancePair3Before)} USD+`);

    // ===== USD+ TOKEN: NUKE SUPPLY =====
    addProposalItem(USD_Plus, 'upgradeTo', [tmpUsdPlusImpl]);
    addProposalItem(USD_Plus, 'swapNuke', [true]);
    addProposalItem(USD_Plus, 'upgradeTo', [finalUsdPlusImpl]);

    if (hre.network.name === 'localhost') {
        const timelock = await getContract('AgentTimelock');
        await transferETH(15, timelock.address);
    }

    await testProposal(addresses, values, abis);
    // await createProposal(filename, addresses, values, abis);

    console.log("\n===== AFTER EXECUTION =====\n");
    
    const balanceWalAfter = await USD_Plus.balanceOf(wal);
    const balancePair1After = await USD_Plus.balanceOf(pair1);
    const balancePair2After = await USD_Plus.balanceOf(pair2);
    const balancePair3After = await USD_Plus.balanceOf(pair3);
    
    console.log(`[WALLET] USD+ balance: ${fromE18(balanceWalAfter)} USD+`);
    console.log(`[PAIR1] USD+ balance: ${fromE18(balancePair1After)} USD+`);
    console.log(`[PAIR2] USD+ balance: ${fromE18(balancePair2After)} USD+`);
    console.log(`[PAIR3] USD+ balance: ${fromE18(balancePair3After)} USD+`);

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



    