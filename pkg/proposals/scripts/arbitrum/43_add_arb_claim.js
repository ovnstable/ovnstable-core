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

    let StrategySiloUsdtArb = await getContract('StrategySiloUsdtArb', 'arbitrum_usdt');
    let StrategySiloUsdtWbtc = await getContract('StrategySiloUsdtWbtc', 'arbitrum_usdt');

    let StrategySiloEth = await getContract('StrategySiloEth', 'arbitrum_eth');

    // StrategySiloUsdc
    addProposalItem(StrategySiloUsdc, 'upgradeTo', ['0xD804F6bBE257cb32Ae2d8492378b46F47383F207']);
    addProposalItem(StrategySiloUsdc, 'setParams', [await strategySiloUsdc()]);
    addProposalItem(StrategySiloUsdc, 'whitelistAngleOperator', ['0x899ce09fA986448fc00992Dc4A5E1c6ad528D6D9']);

    addProposalItem(StrategySiloUsdcArb, 'upgradeTo', ['0x90A364Aa56a84E776649906C97b4077468CEd818']);
    addProposalItem(StrategySiloUsdcArb, 'setParams', [await strategySiloUsdcArb()]);
    addProposalItem(StrategySiloUsdcArb, 'whitelistAngleOperator', ['0x899ce09fA986448fc00992Dc4A5E1c6ad528D6D9']);

    addProposalItem(StrategySiloUsdcWbtc, 'upgradeTo', ['0xD804F6bBE257cb32Ae2d8492378b46F47383F207']);
    addProposalItem(StrategySiloUsdcWbtc, 'setParams', [await strategySiloUsdcWbtc()]);
    addProposalItem(StrategySiloUsdcWbtc, 'whitelistAngleOperator', ['0x899ce09fA986448fc00992Dc4A5E1c6ad528D6D9']);

    // StrategySiloUsdtUsdc
    addProposalItem(StrategySiloUsdtArb, 'upgradeTo', ['0x24fB0b6d2605dDCe9C4803e4a1BE9ace2d7649B9']);
    addProposalItem(StrategySiloUsdtArb, 'setParams', [await strategySiloUsdtArb()]);
    addProposalItem(StrategySiloUsdtArb, 'whitelistAngleOperator', ['0x899ce09fA986448fc00992Dc4A5E1c6ad528D6D9']);

    addProposalItem(StrategySiloUsdtWbtc, 'upgradeTo', ['0x24fB0b6d2605dDCe9C4803e4a1BE9ace2d7649B9']);
    addProposalItem(StrategySiloUsdtWbtc, 'setParams', [await strategySiloUsdtWbtc()]);
    addProposalItem(StrategySiloUsdtWbtc, 'whitelistAngleOperator', ['0x899ce09fA986448fc00992Dc4A5E1c6ad528D6D9']);

    // StrategySiloEth
    addProposalItem(StrategySiloEth, 'upgradeTo', ['0xf41b570Ec42F01eBD9ECC5732999f69AEd0e5212']);
    addProposalItem(StrategySiloEth, 'setParams', [await strategySiloEth()]);
    addProposalItem(StrategySiloEth, 'whitelistAngleOperator', ['0x899ce09fA986448fc00992Dc4A5E1c6ad528D6D9']);

    // await testProposal(addresses, values, abis);

    // await testStrategy(filename, StrategySiloUsdtArb, 'arbitrum_usdt')
    // await testStrategy(filename, StrategySiloUsdtWbtc, 'arbitrum_usdt')

    // await testUsdPlus(filename, 'arbitrum');
    // await testUsdPlus(filename, 'arbitrum_usdt');
    // await testUsdPlus(filename, 'arbitrum_eth');

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
