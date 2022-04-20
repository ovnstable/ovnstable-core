const hre = require("hardhat");
const fs = require("fs");
const {initWallet } = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;
const {expect} = require("chai");

let Strategy = JSON.parse(fs.readFileSync('./artifacts/contracts/Strategy.sol/Strategy.json'));

let TimelockController = JSON.parse(fs.readFileSync('../governance/deployments/polygon/OvnTimelockController.json'));

let price = { maxFeePerGas: "1400000000000", maxPriorityFeePerGas: "1400000000000" };


async function main() {

    let wallet = await initWallet(ethers);

    let timeLock = await ethers.getContractAt(TimelockController.abi, TimelockController.address, wallet);
    let strategy = await ethers.getContractAt(Strategy.abi, "0x84152E7d666fC05cC64dE99959176338f783F8Eb", wallet);


    await moveRules(strategy, wallet.address , timeLock.address);
    await printRules(strategy, 'Arrakis');

    async function moveRules(contract, oldAddress, newAddress) {

        console.log(`Move contract: ${contract.address}: oldAddress: ${oldAddress} => newAddress: ${newAddress}`);

        await (await contract.grantRole(await contract.DEFAULT_ADMIN_ROLE(), newAddress, price)).wait();
        await (await contract.grantRole(await contract.UPGRADER_ROLE(), newAddress, price)).wait();

        await (await contract.revokeRole(await contract.UPGRADER_ROLE(), oldAddress, price)).wait();
        await (await contract.revokeRole(await contract.DEFAULT_ADMIN_ROLE(), oldAddress, price)).wait();
    }

    async function printRules(contract, name) {

        try {
            console.log(`\n[${name}]`);
            expect(false, 'hasRole(ADMIN) WALLET = false').to.equal(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), wallet.address));
            expect(true, 'hasRole(ADMIN) NEW_TIME_LOCK = true').to.equal(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), timeLock.address));

            expect(false, 'hasRole(UPGRADED) WALLET = false').to.equal(await contract.hasRole(await contract.UPGRADER_ROLE(), wallet.address));
            expect(true, 'hasRole(UPGRADED) NEW_TIME_LOCK = true').to.equal(await contract.hasRole(await contract.UPGRADER_ROLE(), timeLock.address));
        } catch (e) {
            console.log('Error test: ' + e)
            return;
        }

        console.log('Done')
    }

}






main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
