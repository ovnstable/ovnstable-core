const { ethers } = require('hardhat');

async function main() {

    let addresses = [
        '0xC8BD407d9A361Cb2eAf439565F61C92B968ac956',
        '0x0bE3f37201699F00C21dCba18861ed4F60288E1D',
        '0xad049b6c7e32c9cf9a49bf803185fe52bfabb33c',
        '0xF37955134Dda37eaC7380f5eb42bce10796bD224',
        '0xeFf441b2b30027cd15D350726B37F1B38EC1b955'
    ]

    let startTimestamp = (new Date("Sep-13-2023 05:46:59 AM")).getTime() / 1000;
    let durationSeconds = 2 * 365 * 24 * 60 * 60; // ~two years
    
    for (const lockupAddress of addresses) {
        let params = {
            beneficiaryAddress: lockupAddress,
            startTimestamp: startTimestamp,
            durationSeconds: durationSeconds,
        }

        let Lockup = await ethers.getContractFactory('Lockup');
        let lockup = await Lockup.deploy(params);
        console.log("Lockup for " + lockupAddress + " created at " + lockup.address);
    }

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

