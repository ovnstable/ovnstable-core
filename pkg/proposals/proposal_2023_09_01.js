const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const { strategyMoonwellUsdbcParams } = require("@overnight-contracts/strategies-base/deploy/05_strategy_moonwell_usdbc");
const { strategyMoonwellDaiParams } = require("@overnight-contracts/strategies-base/deploy/dai/04_strategy_moonwell_dai");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyMoonwellUsdbc = await getContract('StrategyMoonwellUsdbc', 'base');
    let StrategyMoonwellDai = await getContract('StrategyMoonwellDai', 'base_dai');

    addresses.push(StrategyMoonwellUsdbc.address);
    values.push(0);
    abis.push(StrategyMoonwellUsdbc.interface.encodeFunctionData('setParams', [await strategyMoonwellUsdbcParams()]));

    addresses.push(StrategyMoonwellDai.address);
    values.push(0);
    abis.push(StrategyMoonwellDai.interface.encodeFunctionData('setParams', [await strategyMoonwellDaiParams()]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

