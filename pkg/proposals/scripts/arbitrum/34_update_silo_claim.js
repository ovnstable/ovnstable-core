const hre = require("hardhat");
const {getContract, showM2M, execTimelock} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testUsdPlus, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {strategySiloUsdc} = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const {strategySiloUsdcWbtc} = require("@overnight-contracts/strategies-arbitrum/deploy/40_strategy_silo_wbtc");
const {strategySiloUsdcArb} = require("@overnight-contracts/strategies-arbitrum/deploy/41_strategy_silo_arb");
const {strategySiloUsdtWbtc} = require("@overnight-contracts/strategies-arbitrum/deploy/usdt/06_strategy_silo_usdt_wbtc");
const {strategySiloUsdtArb} = require("@overnight-contracts/strategies-arbitrum/deploy/usdt/07_strategy_silo_usdt_arb");
const {strategySiloEth} = require("@overnight-contracts/strategies-arbitrum/deploy/eth/06_strategy_silo_eth");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let StrategySiloUsdc = await getContract('StrategySiloUsdc', 'arbitrum');
    let StrategySiloUsdcArb = await getContract('StrategySiloUsdcArb', 'arbitrum');
    let StrategySiloUsdcWbtc = await getContract('StrategySiloUsdcWbtc', 'arbitrum');

    let StrategySiloUsdtArb = await getContract('StrategySiloUsdtArb', 'arbitrum_usdt');
    let StrategySiloUsdtWbtc = await getContract('StrategySiloUsdtWbtc', 'arbitrum_usdt');
    
    let StrategySiloEth = await getContract('StrategySiloEth', 'arbitrum_eth');

    // StrategySiloUsdc

    addresses.push(StrategySiloUsdc.address);
    values.push(0);
    abis.push(StrategySiloUsdc.interface.encodeFunctionData('upgradeTo', ['0xFc5b6a041Fd35A6E25fe43DEDd2cc14a80D1D0c5']));

    addresses.push(StrategySiloUsdc.address);
    values.push(0);
    abis.push(StrategySiloUsdc.interface.encodeFunctionData('setParams', [await strategySiloUsdc()]));

    
    addresses.push(StrategySiloUsdcArb.address);
    values.push(0);
    abis.push(StrategySiloUsdcArb.interface.encodeFunctionData('upgradeTo', ['0xFc5b6a041Fd35A6E25fe43DEDd2cc14a80D1D0c5']));

    addresses.push(StrategySiloUsdcArb.address);
    values.push(0);
    abis.push(StrategySiloUsdcArb.interface.encodeFunctionData('setParams', [await strategySiloUsdcArb()]));


    addresses.push(StrategySiloUsdcWbtc.address);
    values.push(0);
    abis.push(StrategySiloUsdcWbtc.interface.encodeFunctionData('upgradeTo', ['0xFc5b6a041Fd35A6E25fe43DEDd2cc14a80D1D0c5']));

    addresses.push(StrategySiloUsdcWbtc.address);
    values.push(0);
    abis.push(StrategySiloUsdcWbtc.interface.encodeFunctionData('setParams', [await strategySiloUsdcWbtc()]));

    // StrategySiloUsdtUsdc

    addresses.push(StrategySiloUsdtArb.address);
    values.push(0);
    abis.push(StrategySiloUsdtArb.interface.encodeFunctionData('upgradeTo', ['0x5Ef6E22E2F058983896B5912DE004Bb1F20132f3']));

    addresses.push(StrategySiloUsdtArb.address);
    values.push(0);
    abis.push(StrategySiloUsdtArb.interface.encodeFunctionData('setParams', [await strategySiloUsdtArb()]));


    addresses.push(StrategySiloUsdtWbtc.address);
    values.push(0);
    abis.push(StrategySiloUsdtWbtc.interface.encodeFunctionData('upgradeTo', ['0x5Ef6E22E2F058983896B5912DE004Bb1F20132f3']));

    addresses.push(StrategySiloUsdtWbtc.address);
    values.push(0);
    abis.push(StrategySiloUsdtWbtc.interface.encodeFunctionData('setParams', [await strategySiloUsdtWbtc()]));

    // StrategySiloEth

    addresses.push(StrategySiloEth.address);
    values.push(0);
    abis.push(StrategySiloEth.interface.encodeFunctionData('upgradeTo', ['0x9A3C24027986582A1c3126070FeEedE1d9Bfe08B']));

    addresses.push(StrategySiloEth.address);
    values.push(0);
    abis.push(StrategySiloEth.interface.encodeFunctionData('setParams', [await strategySiloEth()]));


    await testProposal(addresses, values, abis);
    // await testStrategy(filename, strategy, 'arbitrum');
    // await testUsdPlus(filename, 'arbitrum_eth');

    // await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

