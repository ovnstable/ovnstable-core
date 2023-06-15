const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const { strategyBalancerUsdcParams } = require("@overnight-contracts/strategies-polygon/deploy/dai/42_strategy_balancer_usdc");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'polygon');
    let StrategyCurveConvex3Pool = await getContract('StrategyCurveConvex3Pool', 'polygon');
    let StrategyBalancerUsdc = await getContract('StrategyBalancerUsdc', 'polygon');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyCurveConvex3Pool.address]));

    addresses.push(StrategyBalancerUsdc.address);
    values.push(0);
    abis.push(StrategyBalancerUsdc.interface.encodeFunctionData('upgradeTo', ['']));

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

