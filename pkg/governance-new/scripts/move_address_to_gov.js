const {
    initWallet,
    getContract,
    getPrice,
    getStrategyMapping
} = require("@overnight-contracts/common/utils/script-utils");
const {ethers} = require("hardhat");
const GRANT_ROLE = require("./abi/GRANT_ROLE.json");
const {Roles} = require("@overnight-contracts/common/utils/roles");

/**
 * Что делает скрипт?
 *
 * Передает права с dev аккаунта на timelock по всем указанным стратегиям.
 * Список стратегий подставляем руками в скрипт
 *
 * Какие права передаются?
 * - DEFAULT_ADMIN_ROLE - дает админские права на контракт
 * - UPGRADER_ROLE - позволяет выполнять upgrade proxy контракта
 *
 * Перед выполняем на проде, выполните на локальной ноде:
 * - Убедиться, что нет ошибок
 * - Убедиться, что скрипт актуальный и не требует доработки
 *
 * Как понять что все отработало корректно?
 *
 * После выполнения скрипта в каждой строке таблицы должны стоять след. значения:
 *
 * - roleAdminWallet - FALSE
 * - roleAdminTimelock - TRUE
 *
 * - roleUpgradeWallet - FALSE
 * - roleUpgradeTimelock - TRUE
 *
 * @returns
 */
async function main() {


    let names = [
        "0xEA4eE8e40109EC34C5eac187919427bcD9645D4E",
        "0x92AB4cb069Ce1C0598bEBE24e3915484F82337B5",
        "0xEDDe5f5bE99Ad89Cfc99Ca369662C8A5DC83555F"
    ]

    await showRules(names);
    await moveRulesAll(names);
    await showRules(names);

}

async function moveRulesAll(names) {
    let wallet = await initWallet();
    let timeLock = await getContract('AgentTimelock');

    for (const name of names) {
        try {
            await moveRules(name, wallet.address, timeLock.address);
        } catch (e) {
            console.log('Error moveRules: ' + e)
        }
    }
}

async function moveRules(address, oldAddress, newAddress) {

    let contract = await ethers.getContractAt(GRANT_ROLE,address);

    console.log(`Move ${contract.address}: oldAddress: ${oldAddress} => newAddress: ${newAddress}`);

    let hasUpgradeRole = true;

    try {
        await contract.UPGRADER_ROLE();
    } catch (e) {
        hasUpgradeRole = false;
    }

    await (await contract.grantRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)).wait();

    if (hasUpgradeRole) {
        await (await contract.grantRole(Roles.UPGRADER_ROLE, newAddress)).wait();
    }

    if (hasUpgradeRole) {

        if (await contract.hasRole(Roles.UPGRADER_ROLE, newAddress)){
            await (await contract.revokeRole(Roles.UPGRADER_ROLE, oldAddress)).wait();
        }else {
            throw new Error(`${newAddress} not has UPGRADER_ROLE`);
        }

    }

    if (await contract.hasRole(Roles.DEFAULT_ADMIN_ROLE, newAddress)){
        await (await contract.revokeRole(Roles.DEFAULT_ADMIN_ROLE, oldAddress)).wait();
    }else {
        throw new Error(`${newAddress} not has DEFAULT_ADMIN_ROLE`);
    }
}

async function showRules(addresses) {
    let wallet = await initWallet();
    let timeLock = await getContract('AgentTimelock');

    let items = [];
    for (const address of addresses) {

        let contract = await ethers.getContractAt(GRANT_ROLE, address);

        let roleUpgradeWallet = '-';
        let roleUpgradeTimelock = '-';

        try {
            roleUpgradeWallet = (await contract.hasRole(Roles.UPGRADER_ROLE, wallet.address))
            roleUpgradeTimelock = (await contract.hasRole(Roles.UPGRADER_ROLE, timeLock.address))
        } catch (e) {
        }

        try {
            items.push({
                address: contract.address,
                timelock: timeLock.address,
                roleAdminWallet: (await contract.hasRole(Roles.DEFAULT_ADMIN_ROLE, wallet.address)),
                roleAdminTimelock: (await contract.hasRole(Roles.DEFAULT_ADMIN_ROLE, timeLock.address)),

                roleUpgradeWallet: roleUpgradeWallet,
                roleUpgradeTimelock: roleUpgradeTimelock
            });
        } catch (e) {
            console.log('Error get hasRole: ' + e);
        }
    }

    console.table(items);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
