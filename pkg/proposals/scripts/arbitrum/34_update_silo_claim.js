const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {strategySiloUsdcWbtc} = require("@overnight-contracts/strategies-arbitrum/deploy/40_strategy_silo_wbtc");
const {strategySiloUsdcArb} = require("@overnight-contracts/strategies-arbitrum/deploy/41_strategy_silo_arb");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategySiloUsdc = await getContract('StrategySiloUsdc', 'arbitrum');
    let StrategySiloUsdcWbtc = await getContract('StrategySiloUsdcWbtc', 'arbitrum');
    let StrategySiloUsdcArb = await getContract('StrategySiloUsdcArb', 'arbitrum');

    addresses.push(StrategySiloUsdc.address);
    values.push(0);
    abis.push(StrategySiloUsdc.interface.encodeFunctionData('upgradeTo', ['0x2c11A42f8288107B7D5e68142363aC08976C1Cee']));

    addresses.push(StrategySiloUsdc.address);
    values.push(0);
    abis.push(StrategySiloUsdc.interface.encodeFunctionData('setParams', [await strategySiloUsdc()]));

    
    addresses.push(StrategySiloUsdcWbtc.address);
    values.push(0);
    abis.push(StrategySiloUsdcWbtc.interface.encodeFunctionData('upgradeTo', ['0x2c11A42f8288107B7D5e68142363aC08976C1Cee']));

    addresses.push(StrategySiloUsdcWbtc.address);
    values.push(0);
    abis.push(StrategySiloUsdcWbtc.interface.encodeFunctionData('setParams', [await strategySiloUsdcWbtc()]));


    addresses.push(StrategySiloUsdcArb.address);
    values.push(0);
    abis.push(StrategySiloUsdcArb.interface.encodeFunctionData('upgradeTo', ['0x2c11A42f8288107B7D5e68142363aC08976C1Cee']));

    addresses.push(StrategySiloUsdcArb.address);
    values.push(0);
    abis.push(StrategySiloUsdcArb.interface.encodeFunctionData('setParams', [await strategySiloUsdcArb()]));


    await testProposal(addresses, values, abis);
    await testStrategy(filename, strategy, 'arbitrum');
    // await testUsdPlus(filename, 'arbitrum_eth');

    // await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

