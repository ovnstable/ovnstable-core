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

    let exchange = await getContract('Exchange', 'bsc_usdt');
    let pm = await getContract('PortfolioManager', 'bsc_usdt');
    let roleManager = await getContract('RoleManager', 'bsc_usdt');

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('upgradeTo', ['0x0eFA737314F53Df79F15D04450e6E185a9B8E5C4']));

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('setRoleManager', [roleManager.address]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('upgradeTo', ['0x913064Bddc86B26d2fEE08b92E402cDB6810B373']));

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

    // await testProposal(addresses, values, abis);
    // await testUsdPlus(filename, 'base');

    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

