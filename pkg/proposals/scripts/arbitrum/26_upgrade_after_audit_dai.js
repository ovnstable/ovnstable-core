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

    let daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');
    let daiPlusEx = await getContract('Exchange', 'arbitrum_dai');
    
    let upgradeToToken = '0x3f2FeD6FB49Ddc76e4C5CE5738C86704567C4D87';
    let upgradeToExchange = '0x93dD104528B35E82c061BB0D521096dCF11628FA';

    addresses.push(daiPlus.address);
    values.push(0);
    abis.push(daiPlus.interface.encodeFunctionData('upgradeTo', [upgradeToToken]));

    addresses.push(daiPlusEx.address);
    values.push(0);
    abis.push(daiPlusEx.interface.encodeFunctionData('upgradeTo', [upgradeToExchange]));

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

