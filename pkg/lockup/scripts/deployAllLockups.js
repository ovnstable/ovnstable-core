const { ethers } = require('hardhat');
const hre = require("hardhat");

const DEV_ADDRESSES = {
    '0xC8BD407d9A361Cb2eAf439565F61C92B968ac956' : '',
    '0x0be3f37201699f00c21dcba18861ed4f60288e1d' : '', 
    '0xAD049B6c7E32c9cf9A49bf803185FE52bFabb33c' : '', 
    '0xeFf441b2b30027cd15D350726B37F1B38EC1b955' : '', 
    '0x2Ab2cE9eA9a763C2fb854877e2C998F120cb6a76' : '', 
    '0x3f914C1D6afEeD65570A54177EFcC0bd0a65b81f' : '', 
    '0x48D3d39e0F5160CE0FB801f5DF6B1B8f6ae456b4' : '', 
    '0xdeaf42d4a2cc1dc14505ce4e4f59629aec253d75' : '', 
    '0x2385233abb910357e2b97a16d40e0443e53d0769' : ''
}

const OLD_DEV_ADDRESSES = [
    '', 
    '', 
    ''  
]

const OVERNIGHT_ADDRESSES = [
    '', // Treasure 
    ''  // Insurance
]

const INVESTORS_ADDRESSES = [
    '', 
    ''
]

async function main() {

    let addresses = DEV_ADDRESSES;

    let startTimestamp = (new Date("Apr-02-2024 11:00:00 AM")).getTime() / 1000;
    let durationSeconds = 2 * 365 * 24 * 60 * 60; // ~two years

    console.log("startTimestamp", startTimestamp.toString());
    console.log("durationSeconds", durationSeconds.toString());
    
    for (const [userAddress, lockupAddress] of Object.entries(addresses)) {
        let params = {
            beneficiaryAddress: userAddress,
            startTimestamp: startTimestamp,
            durationSeconds: durationSeconds,
        }

        let Lockup = await ethers.getContractFactory('Lockup');
        let lockup = await Lockup.deploy(params);
        console.log("Lockup for " + userAddress + " created at " + lockup.address);

        // await hre.run("verify:verify", {
        //     address: lockupAddress,
        //     constructorArguments: [params],
        //     contract: "contracts/Lockup.sol:Lockup"
        // });
    }

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

