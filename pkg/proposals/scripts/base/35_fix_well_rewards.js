const hre = require('hardhat');
const { getContract, showM2M, execTimelock } = require('@overnight-contracts/common/utils/script-utils');
const { createProposal, testProposal, testUsdPlus, testStrategy } = require('@overnight-contracts/common/utils/governance');
const { Roles } = require('@overnight-contracts/common/utils/roles');

const path = require('path');
const { prepareEnvironment } = require('@overnight-contracts/common/utils/tests');
const { strategyMoonwellParams } = require('@overnight-contracts/strategies-base/deploy/25_strategy_moonwell');
const { strategyMoonwellUsdcParams } = require('@overnight-contracts/strategies-base/deploy/usdc/01_strategy_moonwell_usdc');
const { strategyMoonwellDaiParams } = require('@overnight-contracts/strategies-base/deploy/dai/04_strategy_moonwell_dai');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf('.js'));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let moonwell = await getContract('StrategyMoonwell', 'base');
    let moonwellUsdc = await getContract('StrategyMoonwellUsdc', 'base_usdc');
    let moonwellDai = await getContract('StrategyMoonwellDai', 'base_dai');
    let moonwellImpl = "";
    let moonwellUsdcImpl = "";
    let moonwellDaiImpl = "";

    addProposalItem(moonwell, 'upgradeTo', [moonwellImpl]);
    addProposalItem(moonwell, 'setParams', [await strategyMoonwellParams()]);

    addProposalItem(moonwellUsdc, 'upgradeTo', [moonwellUsdcImpl]);
    addProposalItem(moonwellUsdc, 'setParams', [await strategyMoonwellUsdcParams()]);

    addProposalItem(moonwellDai, 'upgradeTo', [moonwellDaiImpl]);
    addProposalItem(moonwellDai, 'setParams', [await strategyMoonwellDaiParams()]);

    await testProposal(addresses, values, abis);

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
