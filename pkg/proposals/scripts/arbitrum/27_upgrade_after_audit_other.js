const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {ethers} = require("hardhat");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let usdPlus = await getContract('UsdPlusToken', 'arbitrum');
    let usdtPlus = await getContract('UsdPlusToken', 'arbitrum_usdt');
    let ethPlus = await getContract('UsdPlusToken', 'arbitrum_eth');

    let usdPlusEx = await getContract('Exchange', 'arbitrum');
    let usdtPlusEx = await getContract('Exchange', 'arbitrum_usdt');
    let ethPlusEx = await getContract('Exchange', 'arbitrum_eth');

    let usdPlusIns = await getContract('InsuranceExchange', 'arbitrum');

    let upgradeToToken = '0x3f2FeD6FB49Ddc76e4C5CE5738C86704567C4D87';
    let upgradeToExchange = '0x93dD104528B35E82c061BB0D521096dCF11628FA';
    let upgradeToInsurance = '0xA315dC610fF6610F2667851226b6F7C116e1aaB9';

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('upgradeTo', [upgradeToToken]));

    addresses.push(usdtPlus.address);
    values.push(0);
    abis.push(usdtPlus.interface.encodeFunctionData('upgradeTo', [upgradeToToken]));

    addresses.push(ethPlus.address);
    values.push(0);
    abis.push(ethPlus.interface.encodeFunctionData('upgradeTo', [upgradeToToken]));


    addresses.push(usdPlusEx.address);
    values.push(0);
    abis.push(usdPlusEx.interface.encodeFunctionData('upgradeTo', [upgradeToExchange]));

    addresses.push(usdtPlusEx.address);
    values.push(0);
    abis.push(usdtPlusEx.interface.encodeFunctionData('upgradeTo', [upgradeToExchange]));

    addresses.push(ethPlusEx.address);
    values.push(0);
    abis.push(ethPlusEx.interface.encodeFunctionData('upgradeTo', [upgradeToExchange]));

    addresses.push(usdPlusIns.address);
    values.push(0);
    abis.push(usdPlusIns.interface.encodeFunctionData('upgradeTo', [upgradeToInsurance]));

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

