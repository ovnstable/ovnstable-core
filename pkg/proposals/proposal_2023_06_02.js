const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
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
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('upgradeTo', ['0xFA2E545C5613E3531b950ab837a1285DCF5568F3']));

    addresses.push(StrategyWombexUsdt.address);
    values.push(0);
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('setParams', [await strategyWombexUsdtParams()]));


    let StrategyWombexUsdc = await getContract('StrategyWombexUsdc', 'bsc');

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('upgradeTo', ['0x651fAe2DAa54cda64c7405Ce2EE94F888D9fCD5C']));

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('setParams', [await strategyWombexUsdcParams()]));


    let StrategyWombexBusd = await getContract('StrategyWombexBusd', 'bsc');

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('upgradeTo', ['0x1d5dAbAce0840BEBb2a86601aBBFafa6dad856CB']));

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('setParams', [await strategyWombexBusdParams()]));


    addresses.push(StrategyWombexUsdt.address);
    values.push(0);
    abis.push(StrategyWombexUsdt.interface.encodeFunctionData('sendLPTokens', [StrategyMagpieUsdt.address, 5000]));

    addresses.push(StrategyMagpieUsdt.address);
    values.push(0);
    abis.push(StrategyMagpieUsdt.interface.encodeFunctionData('stakeLPTokens', []));

    addresses.push(StrategyWombexUsdc.address);
    values.push(0);
    abis.push(StrategyWombexUsdc.interface.encodeFunctionData('sendLPTokens', [StrategyMagpieUsdc.address, 5000]));

    addresses.push(StrategyMagpieUsdc.address);
    values.push(0);
    abis.push(StrategyMagpieUsdc.interface.encodeFunctionData('stakeLPTokens', []));

    addresses.push(StrategyWombexBusd.address);
    values.push(0);
    abis.push(StrategyWombexBusd.interface.encodeFunctionData('sendLPTokens', [StrategyMagpieBusd.address, 5000]));

    addresses.push(StrategyMagpieBusd.address);
    values.push(0);
    abis.push(StrategyMagpieBusd.interface.encodeFunctionData('stakeLPTokens', []));

    await showM2M();
    await testProposal(addresses, values, abis);
    await showM2M();

    // await testStrategy(StrategyMagpieBusd);
    // await testStrategy(StrategyMagpieUsdc);
    await testStrategy(StrategyMagpieUsdt);
    // await testStrategy(StrategyWombexUsdc);
    await testStrategy(StrategyWombexUsdt);
    // await testStrategy(StrategyWombexBusd);

    // await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

