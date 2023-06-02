const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { strategyWombexUsdtParams } = require("@overnight-contracts/strategies-bsc/deploy/usdt/04_strategy_wombex_usdt.js");
const { strategyWombexUsdcParams } = require("@overnight-contracts/strategies-bsc/deploy/20_strategy_wombex_usdc.js");
const { strategyWombexBusdParams } = require("@overnight-contracts/strategies-bsc/deploy/19_strategy_wombex_busd.js");


async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManagerUsdt = await getContract('PortfolioManager', 'bsc_usdt');

    let StrategyMagpieUsdt = await getContract('StrategyMagpieUsdt', 'bsc_usdt');

    addresses.push(PortfolioManagerUsdt.address);
    values.push(0);
    abis.push(PortfolioManagerUsdt.interface.encodeFunctionData('addStrategy', [StrategyMagpieUsdt.address]));


    let PortfolioManager = await getContract('PortfolioManager', 'bsc');

    let StrategyMagpieUsdc = await getContract('StrategyMagpieUsdc', 'bsc');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyMagpieUsdc.address]));


    let StrategyMagpieBusd = await getContract('StrategyMagpieBusd', 'bsc');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyMagpieBusd.address]));


    let StrategyWombexUsdt = await getContract('StrategyWombexUsdt', 'bsc_usdt');

    addresses.push(StrategyWombexUsdt.address);
    values.push(0);
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyWombexUsdt.address);
    values.push(0);
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('setParams', [await strategyWombexUsdtParams()]));


    let StrategyWombexUsdc = await getContract('StrategyWombexUsdc', 'bsc');

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('setParams', [await strategyWombexUsdcParams()]));


    let StrategyWombexBusd = await getContract('StrategyWombexBusd', 'bsc');

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('setParams', [await strategyWombexBusdParams()]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

