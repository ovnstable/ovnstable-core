const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const { strategyBaseSwapUsdbcDaiParams } = require("@overnight-contracts/strategies-base/deploy/02_strategy_baseswap_usdbc_dai");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyWombatOvnUsdp = await getContract('StrategyWombatOvnUsdp', 'arbitrum');

    addresses.push(StrategyWombatOvnUsdp.address);
    values.push(0);
    abis.push(StrategyWombatOvnUsdp.interface.encodeFunctionData('upgradeTo', ['0x2B8bd83f94F8002980e1eD96F54EBbAB49526fdc']));

    addresses.push(StrategyWombatOvnUsdp.address);
    values.push(0);
    abis.push(StrategyWombatOvnUsdp.interface.encodeFunctionData('transferUsdp', []));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

