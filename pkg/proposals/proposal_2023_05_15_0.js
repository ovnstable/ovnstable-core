const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'arbitrum');

    let StrategyMagpieUsdc = await getContract('StrategyMagpieUsdc', 'arbitrum');
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyMagpieUsdc.address]));

    let StrategyMagpieOvnUsdp = await getContract('StrategyMagpieOvnUsdp', 'arbitrum');
    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyMagpieOvnUsdp.address]));


    let PortfolioManagerDai = await getContract('PortfolioManager', 'arbitrum_dai');

    let StrategyMagpieOvnDaiPlus = await getContract('StrategyMagpieOvnDaiPlus', 'arbitrum_dai');
    addresses.push(PortfolioManagerDai.address);
    values.push(0);
    abis.push(PortfolioManagerDai.interface.encodeFunctionData('addStrategy', [StrategyMagpieOvnDaiPlus.address]));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

