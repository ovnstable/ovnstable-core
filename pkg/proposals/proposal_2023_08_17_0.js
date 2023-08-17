const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const { strategyBalancerUsdcParams } = require("@overnight-contracts/strategies-polygon/deploy/42_strategy_balancer_usdc");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let StrategyBalancerUsdc = await getContract('StrategyBalancerUsdc', 'polygon');

    addresses.push(StrategyBalancerUsdc.address);
    values.push(0);
    abis.push(StrategyBalancerUsdc.interface.encodeFunctionData('upgradeTo', ['0xc31Add01a1c18F883bDE8234835F96e894D764e3']));

    addresses.push(StrategyBalancerUsdc.address);
    values.push(0);
    abis.push(StrategyBalancerUsdc.interface.encodeFunctionData('setParams', [await strategyBalancerUsdcParams()]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

