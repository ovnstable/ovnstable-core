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
    let daiPlus = await getContract('UsdPlusToken', 'arbitrum_dai');
    let ethPlus = await getContract('UsdPlusToken', 'arbitrum_eth');
    let roleManager = await getContract('RoleManager', 'arbitrum');

    let upgradeTo = '0x09D9E27DfCBB027758021DBC995Df159CCb13142';

    addresses.push(usdPlus.address);
    values.push(0);
    abis.push(usdPlus.interface.encodeFunctionData('upgradeTo', [upgradeTo]));

    addresses.push(daiPlus.address);
    values.push(0);
    abis.push(daiPlus.interface.encodeFunctionData('upgradeTo', [upgradeTo]));

    addresses.push(ethPlus.address);
    values.push(0);
    abis.push(ethPlus.interface.encodeFunctionData('upgradeTo', [upgradeTo]));


    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

