const hre = require("hardhat");
const {getContract, showM2M, execTimelock, transferAsset, getERC20ByAddress, transferETH } = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

const {BLAST} = require("@overnight-contracts/common/utils/assets");
const { toAsset } = require("@overnight-contracts/common/utils/decimals");

async function main() {
    console.log("We are in testThrusterSwap.js")

    let strategy = await getContract('StrategyThrusterSwap', 'blast');

    // console.log("#1")

    // await transferETH(1, '0x8df424e487De4218B347e1798efA11A078fecE90');
    // console.log("#2")
    // console.log("BLAST.usdb", BLAST.usdb)
    // console.log(" strategy.address",  strategy.address)

    // // await transferAsset(BLAST.usdb, strategy.address, toAsset(100));
    // console.log("#3")

    // console.log("All transfered")

    // await (await strategy.testUnstakeFull(200000000000000000n)).wait();

    // console.log("Test ends")

    // usdb = await getERC20ByAddress('0x4300000000000000000000000000000000000003', '0xBa6b468e6672514f3c59D5D8B8731B1956BA5D22')

    // usdbBefore = await usdb.balanceOf(strategy.address);
    // console.log("usdbBefore ", usdbBefore);


    // console.log("#1")

    // await (await strategy.testStake()).wait();

    // console.log("#2")

    // usdbAfter = await usdb.balanceOf(strategy.address);
    // console.log("usdbAfter ", usdbAfter);

    await testStrategy(filename, strategy, 'blast'); 
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });