const hre = require('hardhat');
const { getContract, showM2M, execTimelock } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');

const path = require('path');
const { prepareEnvironment } = require('@overnight-contracts/common/utils/tests');
const { strategySiloUsdc } = require('@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc');
const { strategySiloUsdcWbtc } = require('@overnight-contracts/strategies-arbitrum/deploy/40_strategy_silo_wbtc');
const { strategySiloUsdcArb } = require('@overnight-contracts/strategies-arbitrum/deploy/41_strategy_silo_arb');
const { strategySiloUsdtWbtc } = require('@overnight-contracts/strategies-arbitrum/deploy/usdt/06_strategy_silo_usdt_wbtc');
const { strategySiloUsdtArb } = require('@overnight-contracts/strategies-arbitrum/deploy/usdt/07_strategy_silo_usdt_arb');
const { strategySiloEth } = require('@overnight-contracts/strategies-arbitrum/deploy/eth/06_strategy_silo_eth');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let StrategySiloUsdc = await getContract('StrategySiloUsdc', 'arbitrum');
    let StrategySiloUsdcArb = await getContract('StrategySiloUsdcArb', 'arbitrum');
    let StrategySiloUsdcWbtc = await getContract('StrategySiloUsdcWbtc', 'arbitrum');

    let operator = '0x899ce09fA986448fc00992Dc4A5E1c6ad528D6D9';

    addProposalItem(StrategySiloUsdc, 'whitelistAngleOperator', [operator]);

    addProposalItem(StrategySiloUsdcArb, 'whitelistAngleOperator', [operator]);

    addProposalItem(StrategySiloUsdcWbtc, 'whitelistAngleOperator', [operator]);

    // await testProposal(addresses, values, abis);

    // await testStrategy(filename, StrategySiloUsdc, 'arbitrum')
    // await testStrategy(filename, StrategySiloUsdtArb, 'arbitrum')
    // await testStrategy(filename, StrategySiloUsdtWbtc, 'arbitrum')

    // await testUsdPlus(filename, 'arbitrum');

    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
