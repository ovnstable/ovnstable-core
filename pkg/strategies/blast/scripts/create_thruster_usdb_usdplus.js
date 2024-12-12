const {getContract, getPrice, showM2M, getContractByAddress} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE6, fromE18} = require("@overnight-contracts/common/utils/decimals");
const { BLAST } = require("@overnight-contracts/common/utils/assets");
const { ethers } = require("hardhat");

async function main() {
    let factory = await ethers.getContractAt(
        'IThrusterPoolFactory', 
        '0x71b08f13B3c3aF35aAdEb3949AFEb1ded1016127'
    );
    let new_pool = await (await factory.createPool(
        BLAST.usdPlus, 
        BLAST.usdb, 
        100n
    )).wait();

    console.log("new address:", new_pool)
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


