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

    let usdPlus = await getContract('UsdPlusToken', 'bsc');
    let usdtPlus = await getContract('UsdPlusToken', 'bsc_usdt');

    let usdPlusEx = await getContract('Exchange', 'bsc');
    let usdtPlusEx = await getContract('Exchange', 'bsc_usdt');

    let upgradeToToken = '0xa2dbE1D92d9C66DbB3e4C9358d91988907bC9Ad4';
    let upgradeToExchange = '0x3f2FeD6FB49Ddc76e4C5CE5738C86704567C4D87';

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('upgradeTo', [upgradeToToken]));

    addresses.push(usdtPlus.address);
    values.push(0);
    abis.push(usdtPlus.interface.encodeFunctionData('upgradeTo', [upgradeToToken]));

    addresses.push(usdPlusEx.address);
    values.push(0);
    abis.push(usdPlusEx.interface.encodeFunctionData('upgradeTo', [upgradeToExchange]));

    addresses.push(usdtPlusEx.address);
    values.push(0);
    abis.push(usdtPlusEx.interface.encodeFunctionData('upgradeTo', [upgradeToExchange]));

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'bsc');
    // await testUsdPlus(filename, 'bsc_usdt');
    await createProposal(filename, addresses, values, abis);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

