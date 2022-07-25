const hre = require("hardhat");
const {initWallet, getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;
const {expect} = require("chai");



async function main() {

    let price = await getPrice();
    let wallet = await initWallet(ethers);

    let timeLock = await getContract('OvnTimelockController');
    let strategy = await getContract('StrategyDystopiaUsdcTusd');

    await moveRules(strategy, wallet.address , timeLock.address);
    await printRules(strategy, 'StrategyDystopiaUsdcTusd');

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
