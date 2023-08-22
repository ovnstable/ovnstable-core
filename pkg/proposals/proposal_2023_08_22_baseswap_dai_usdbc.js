const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const { strategyBaseSwapDaiUsdbcParams } = require("@overnight-contracts/strategies-base/deploy/dai/02_strategy_baseswap_dai_usdbc");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyBaseSwapDaiUsdbc = await getContract('StrategyBaseSwapDaiUsdbc', 'base_dai');

    addresses.push(StrategyBaseSwapDaiUsdbc.address);
    values.push(0);
    abis.push(StrategyBaseSwapDaiUsdbc.interface.encodeFunctionData('upgradeTo', ['0xF29443ec2a0664eB33eab0A585a2c97ac1de4693']));

    addresses.push(StrategyBaseSwapDaiUsdbc.address);
    values.push(0);
    abis.push(StrategyBaseSwapDaiUsdbc.interface.encodeFunctionData('setParams', [await strategyBaseSwapDaiUsdbcParams()]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

