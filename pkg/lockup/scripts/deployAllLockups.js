const { ethers } = require('hardhat');
const hre = require("hardhat");

const DEV_ADDRESSES = {
    '0xC8BD407d9A361Cb2eAf439565F61C92B968ac956' : '0x58dE7fCdd5d7a20C63fCcB973010b95bF94fA333',
    '0x0be3f37201699f00c21dcba18861ed4f60288e1d' : '0x3cb5731FF374c8972cE85d925f9be62c21853b5b', 
    '0xAD049B6c7E32c9cf9A49bf803185FE52bFabb33c' : '0x0a0831abF5CBD7fEBe7C874AD96E987eed865004', 
    '0xeFf441b2b30027cd15D350726B37F1B38EC1b955' : '0x3A96A7196222b29463E99Cbfba672141a2bB62fd', 
    '0x2Ab2cE9eA9a763C2fb854877e2C998F120cb6a76' : '0xD2e2e443c100Eac4b625B411010C34EAd0515735', 
    '0x3f914C1D6afEeD65570A54177EFcC0bd0a65b81f' : '0x52eF8022CB0C6be1F8733B33965560002AeC855c', 
    '0x48D3d39e0F5160CE0FB801f5DF6B1B8f6ae456b4' : '0x1519814CD74F2Ea6C5580137cCabc70Ea4493426', 
    '0xdeaf42d4a2cc1dc14505ce4e4f59629aec253d75' : '0xff7104aE44f01C1be87fb9Eac09772715c66D9E1', 
    '0x2385233abb910357e2b97a16d40e0443e53d0769' : '0x019D17272687904F855D235dbBA7fD9268088Ea5',
    '0xe497285e466227f4e8648209e34b465daa1f90a0' : '0xE4e83F7083d3F9260285691AAA47E8c57078e311'
}

const OLD_DEV_ADDRESSES = {
    '0xF4B67f83a65500D2692e2637acFe382cE09fC90b' : '0xcFB4d82207cB944FAD439feb544eB18ABdef41E3', 
    '0xa3a7739486aCe332F3BB307C6e5ee175Fa131839' : '0xF586C5047967DA9f62A8A308119F0811d4b356Be'  
}

const OVERNIGHT_ADDRESSES = {
    '0xc0c4dd0e05d5e224e19eaf37eca5eafd8fe51a67' : '0x182fF2C75e0163CEF0b893D24716B4CD9111E926', // Treasure 
    '0xc0c4dd0e05d5e224e19eaf37eca5eafd8fe51a67' : '0x90D3BF3681E18654D7F4ee046EDb24CD474E0734'  // Insurance
}

const INVESTORS_ADDRESSES = [
    '', 
    ''
]

async function main() {

    let addresses = DEV_ADDRESSES;

    let startTimestamp = (new Date("Apr-02-2024 11:00:00 AM")).getTime() / 1000;
    let durationSeconds = 2 * 365 * 24 * 60 * 60; // ~two years
    // let startTimestamp = (new Date("Oct-02-2023 11:00:00 AM")).getTime() / 1000;
    // let durationSeconds = 182 * 24 * 60 * 60; // ~half year

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

