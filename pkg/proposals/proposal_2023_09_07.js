const { getContract, execTimelock, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManagerDai = await getContract('PortfolioManager', 'base_dai');
    let StrategyEtsIotaDai = await getContract('StrategyEtsIotaDai', 'base_dai');
    let StrategyEtsKappaDai = await getContract('StrategyEtsKappaDai', 'base_dai');
    let StrategyEtsLambdaDai = await getContract('StrategyEtsLambdaDai', 'base_dai');

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategyEtsIotaDai.address]));

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategyEtsKappaDai.address]));

    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategyEtsLambdaDai.address]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

