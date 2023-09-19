const { ethers } = require('hardhat');
const hre = require("hardhat");

const DEV_ADDRESSES = {
    '0xC8BD407d9A361Cb2eAf439565F61C92B968ac956' : '0xFDB424683Fc803DDd61d9C8351CFA9A881cEF173',
    '0x0be3f37201699f00c21dcba18861ed4f60288e1d' : '0xcC8e370892Cf5c2627B1E642DcF2C4218583c51d', 
    '0xAD049B6c7E32c9cf9A49bf803185FE52bFabb33c' : '0xb83e96f53458C7Ac1C56eef0a98E1e86AC6A752d', 
    '0xeFf441b2b30027cd15D350726B37F1B38EC1b955' : '0x44409293f1C3b37F00E4b5D09a6039Bf888CE5eE', 
    '0x2Ab2cE9eA9a763C2fb854877e2C998F120cb6a76' : '0x019CFA4D703b9F48643AdC38C68b47a98651a273', 
    '0x3f914C1D6afEeD65570A54177EFcC0bd0a65b81f' : '0x37DC6A04B7549871938C3411b73c66fc7D5eE9c3', 
    '0x48D3d39e0F5160CE0FB801f5DF6B1B8f6ae456b4' : '0xaDF79A8315B7ab571d5dD56eF6F253c4695eaa19', 
    '0xdeaf42d4a2cc1dc14505ce4e4f59629aec253d75' : '0x552a79CbD61235809e86ca1322c38e97d1045A9d', 
    '0x2385233abb910357e2b97a16d40e0443e53d0769' : '0x3FF50D3Fb424fdE5357C6e5Ca1BF3463497c41B6'
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

    let startTimestamp = (new Date("Mar-18-2024 11:00:00 AM")).getTime() / 1000;
    let durationSeconds = 2 * 365 * 24 * 60 * 60; // ~two years
    
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

