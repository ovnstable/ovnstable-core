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

    let exchange = await getContract('Exchange', 'arbitrum_dai');
    let pm = await getContract('PortfolioManager', 'arbitrum_dai');
    let roleManager = await getContract('RoleManager', 'arbitrum_dai');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0xBAd6ae6b9c4B52F4DF2cDEe507b71107F7D13E18']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setRoleManager', [roleManager.address]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('upgradeTo', ['0xa78BE2fD2A7357961D950A235fF52Ce0b8f31201']));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('setRoleManager', [roleManager.address]));


    let strategies = await pm.getAllStrategyWeights();
    for (const strategy of strategies) {

        if (strategy.targetWeight.toString() === "0"){

            addresses.push(pm.address);
            values.push(0);
            abis.push(pm.interface.encodeFunctionData('removeStrategy', [strategy.strategy]));
        }

    }

    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

