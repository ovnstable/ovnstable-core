const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'bsc');
    let StrategyThenaUsdcUsdt = await getContract('StrategyThenaUsdcUsdt', 'bsc');
    let PortfolioManagerUsdt = await getContract('PortfolioManager', 'bsc_usdt');
    let StrategyThenaUsdtUsdc = await getContract('StrategyThenaUsdtUsdc', 'bsc_usdt');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyThenaUsdcUsdt.address]));

    addresses.push(PortfolioManagerUsdt.address);
    values.push(0);
    abis.push(PortfolioManagerUsdt.interface.encodeFunctionData('addStrategy', [StrategyThenaUsdtUsdc.address]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

