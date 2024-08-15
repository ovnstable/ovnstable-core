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

    let exchange = await getContract('Exchange', 'optimism_dai');
    let pm = await getContract('PortfolioManager', 'optimism_dai');
    let roleManager = await getContract('RoleManager', 'optimism_dai');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0x9a8687eF7B01375173aEF4446aBD25e7E744EBa2']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setRoleManager', [roleManager.address]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('upgradeTo', ['0xD9F74C70c28bba1d9dB0c44c5a2651cBEB45f3BA']));

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

    await testProposal(addresses, values, abis);
    await testUsdPlus(filename, 'optimism_dai');

    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

