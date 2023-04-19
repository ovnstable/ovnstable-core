const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {ethers} = require("hardhat");
const {fromE6, fromAsset} = require("@overnight-contracts/common/utils/decimals");
const {showPoolOperations} = require("@overnight-contracts/common/utils/payoutListener");

/**
 *  Parse transactions logs and calculating skim amount for every pool
 *  Work only with chain: ARBITRUM
 *  Work only with dex: Solidlizard, Sterling
 *
 *  Put transaction hashes to variable `hashes` and run script.
 */

async function main() {

    let hash = '0x476e534e813406b6872a4a32eae03f8495216358f9fc510c7ed7f1faa2c183e7';

    let receipt = await ethers.provider.getTransactionReceipt(hash);
    console.log('Receipt found: ' + receipt.transactionHash);
    console.log('Logs: ' + receipt.logs.length);

    await showPoolOperations(receipt);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

