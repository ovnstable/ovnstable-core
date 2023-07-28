const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const fs = require("fs");
const {ethers} = require("hardhat");

async function main() {


    let poolAddress = '0x760B36C9024d27b95e45a1aA033aaDCB87DA77Dc';
    let wallet = await initWallet();

    let ABI = [{
        "inputs": [],
        "name": "sync",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }]

    let pool = await ethers.getContractAt(ABI, poolAddress, wallet);

    let receipt = await (await pool.sync()).wait();

    console.log('Sync pool success: ' + receipt.transactionHash);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

