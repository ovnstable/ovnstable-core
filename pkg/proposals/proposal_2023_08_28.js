const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'base_dai');
    let StrategyMoonwellDai = await getContract('StrategyMoonwellDai', 'base_dai');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyMoonwellDai.address]));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('setCashStrategy', [StrategyMoonwellDai.address]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

