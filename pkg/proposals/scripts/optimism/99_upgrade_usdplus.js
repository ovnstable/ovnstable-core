const hre = require("hardhat");
const { getContract, showM2M, execTimelock, getPrice, initWallet, transferETH, getERC20 } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { ethers } = require("hardhat");
const {getImplementationAddress} = require('@openzeppelin/upgrades-core');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    console.log("═══════════════════════════════════════════════════════════");
    console.log("  PROPOSAL: ОБНОВЛЕНИЕ USD+ НА UsdPlusUpdated");
    console.log("═══════════════════════════════════════════════════════════\n");

    // Определяем stand для localhost/hardhat
    const stand = hre.network.name === 'localhost' || hre.network.name === 'hardhat' 
        ? (hre.ovn?.stand || process.env.STAND || 'optimism')
        : hre.network.name;

    // Получаем контракты
    let usdPlus = await getContract('UsdPlusToken', stand);
    
    console.log("📦 ШАГ 1: Деплой новой реализации UsdPlusUpdated...\n");
    
    // Деплоим новую реализацию UsdPlusUpdated
    const wallet = await initWallet();
    
    const updatedArtifact = await hre.artifacts.readArtifact("UsdPlusUpdated");
    const UpdatedFactory = await ethers.getContractFactory(
        "UsdPlusUpdated",
        wallet
    );
    
    console.log("   Деплоим новую реализацию...");
    const newImplementation = await UpdatedFactory.deploy();
    await newImplementation.deployed();
    const newImpl = newImplementation.address;
    
    console.log("   ✅ Новая реализация задеплоена:", newImpl);
    console.log("   ✅ UsdPlusToken адрес:", usdPlus.address);
    console.log("\n⏳ Создаем proposal...");

    // Добавляем транзакцию upgradeTo
    addProposalItem(usdPlus, 'upgradeTo', [newImpl]);

    // ============================================
    // ЛОКАЛЬНОЕ ТЕСТИРОВАНИЕ (localhost/hardhat)
    // ============================================
    if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
        console.log("\n🧪 ЛОКАЛЬНОЕ ТЕСТИРОВАНИЕ...\n");
        await testProposal(addresses, values, abis);
        
        // Проверяем, что обновление прошло успешно
        console.log("\n✅ Проверка обновления...");
        const implementationAddress = await getImplementationAddress(ethers.provider, usdPlus.address);
        console.log("   Адрес реализации после обновления:", implementationAddress);
        console.log("   Ожидаемый адрес:", newImpl);
        
        if (implementationAddress.toLowerCase() === newImpl.toLowerCase()) {
            console.log("   ✅ Обновление успешно! Реализация совпадает.");
        } else {
            console.log("   ❌ Ошибка: Реализация не совпадает!");
        }
        
        // Проверяем наличие функции nukeSupply
        try {
            const usdPlusUpdated = await ethers.getContractAt("UsdPlusUpdated", usdPlus.address, wallet);
            const hasNukeSupply = usdPlusUpdated.interface.hasFunction("nukeSupply");
            console.log("   Функция nukeSupply доступна:", hasNukeSupply ? "✅ Да" : "❌ Нет");
        } catch (e) {
            console.log("   ⚠️  Не удалось проверить функцию nukeSupply:", e.message);
        }
    } else {
        // ============================================
        // СОЗДАНИЕ JSON ДЛЯ MULTISIG (реальная сеть)
        // ============================================
        console.log("\n📋 СОЗДАНИЕ JSON ДЛЯ MULTISIG...\n");
        await createProposal(filename, addresses, values, abis);
    }

    if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
        console.log("\n✅ Proposal создан!");
        console.log("   Файл: pkg/proposals/batches/optimism/99_upgrade_usdplus.json");
        console.log("\n📋 Следующие шаги:");
        console.log("   1. Загрузить JSON в Gnosis Safe (ovnAgent)");
        console.log("   2. Подписать schedule() транзакции");
        console.log("   3. Подождать delay (6 часов)");
        console.log("   4. Подписать execute() транзакции");
    } else {
        console.log("\n✅ Локальное тестирование завершено!");
    }

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
