const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const { strategyBaseSwapUsdbcDaiParams } = require("@overnight-contracts/strategies-base/deploy/02_strategy_baseswap_usdbc_dai");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyBaseSwapUsdbcDai = await getContract('StrategyBaseSwapUsdbcDai', 'base');

    addresses.push(StrategyBaseSwapUsdbcDai.address);
    values.push(0);
    abis.push(StrategyBaseSwapUsdbcDai.interface.encodeFunctionData('upgradeTo', ['0x4198956aFf8E76772123E9cDac55e83E82312b84']));

    addresses.push(StrategyBaseSwapUsdbcDai.address);
    values.push(0);
    abis.push(StrategyBaseSwapUsdbcDai.interface.encodeFunctionData('setParams', [await strategyBaseSwapUsdbcDaiParams()]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

