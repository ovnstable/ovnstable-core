const hre = require("hardhat");
const fs = require("fs");
const {initWallet, getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const ethers = hre.ethers;
const {expect} = require("chai");
const {toE18, fromE18} = require("@overnight-contracts/common/utils/decimals");


async function main() {

    let price = await getPrice();

    let wallet = await initWallet(ethers);


    let timeLock = await getContract('OvnTimelockController');
    let exchange = await getContract('Exchange');
    let pm = await getContract('PortfolioManager');
    let m2m = await getContract('Mark2Market');
    let usdPlus = await getContract('UsdPlusToken');
    let aave = await getContract("StrategyAave");
    let ovnToken = await getContract('OvnToken');

    await moveRules(exchange, wallet.address , timeLock.address);
    await printRules(exchange, 'Exchange');

    await moveRules(pm, wallet.address , timeLock.address);
    await printRules(pm, 'PM');

    await moveRules(m2m, wallet.address , timeLock.address);
    await printRules(m2m, 'M2m');

    await moveRules(usdPlus, wallet.address , timeLock.address);
    await printRules(usdPlus, 'USD+');

    await moveRules(aave, wallet.address , timeLock.address);
    await printRules(aave, 'Aave');

    await (await ovnToken.mint(wallet.address, toE18(100_000_000))).wait();
    console.log('OVN balance: ' + fromE18(await ovnToken.balanceOf(wallet.address)));

    await moveRules(ovnToken, wallet.address , timeLock.address);
    await printRules(ovnToken, 'OvnToken');


    console.log('\n[OvnTimelockController]')

    await (await timeLock.revokeRole(await timeLock.UPGRADER_ROLE(), wallet.address, price)).wait();
    await (await timeLock.revokeRole(await timeLock.DEFAULT_ADMIN_ROLE(), wallet.address, price)).wait();

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
