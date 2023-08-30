const { getContract, execTimelock, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'base');
    let StrategyEtsGamma = await getContract('StrategyEtsGamma', 'base');
    let StrategyEtsEpsilon = await getContract('StrategyEtsEpsilon', 'base');

    let PortfolioManagerDai = await getContract('PortfolioManager', 'base_dai');
    let StrategyEtsDeltaDai = await getContract('StrategyEtsDeltaDai', 'base_dai');
    let StrategyEtsZetaDai = await getContract('StrategyEtsZetaDai', 'base_dai');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyEtsGamma.address]));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyEtsEpsilon.address]));

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategyEtsDeltaDai.address]));

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategyEtsZetaDai.address]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

