const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'arbitrum');
    let PortfolioManagerDai = await getContract('PortfolioManager', 'arbitrum_dai');

    let StrategyBalancerUsdc = await getContract('StrategyBalancerUsdc', 'arbitrum');
    let StrategyBalancerDai = await getContract('StrategyBalancerDai', 'arbitrum_dai');
    let StrategyAuraDaiUsdcUsdt = await getContract('StrategyAuraDaiUsdcUsdt', 'arbitrum_dai');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyBalancerUsdc.address]));

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategyBalancerDai.address]));

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategyAuraDaiUsdcUsdt.address]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

