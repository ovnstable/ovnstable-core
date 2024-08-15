const {getContract, getPrice, showM2M, getERC20} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {ethers} = require("hardhat");

async function main() {

    let exchange = await getContract('Exchange');

    let hash = "0xbdd1c01063b30dc39c4985b7aa2ff95066a1404cde6e07be3f24094c4856d4ad";

    let tx = await ethers.provider.getTransaction(hash);
    let receipt = await ethers.provider.getTransactionReceipt(hash);

    console.log('BlockNumber: ' + receipt.blockNumber.toString());
    console.log('lastBlockNumber: ' + await exchange.lastBlockNumber());
    console.log('gasUsed:  ' + receipt.gasUsed);
    console.log('gasLimit: ' + tx.gasLimit);




    let result = exchange.interface.decodeFunctionData('mint', tx.data);
    console.log(result)
    console.log(result[0].amount.toString());

    let usdc = await getERC20('usdc');

    console.log((await usdc.allowance(receipt.from, exchange.address, {blockTag: receipt.blockNumber} )).toString())
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

