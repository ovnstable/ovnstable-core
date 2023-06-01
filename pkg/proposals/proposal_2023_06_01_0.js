const { getContract, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { strategyWombatDaiParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/03_strategy_wombat_dai.js");
const { strategyMagpieDaiParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/04_strategy_magpie_dai.js");
const { strategyWombatOvnDaiPlusParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/05_wombat_ovn_daiplus.js");
const { strategyMagpieOvnDaiPlusParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/06_magpie_ovn_daiplus.js");
const { strategyWombatUsdcParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/15_strategy_wombat_usdc.js");
const { strategyWombatUsdtParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/17_strategy_wombat_usdt.js");
const { strategyMagpieUsdcParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/18_strategy_magpie_usdc.js");
const { strategyWombatOvnUsdpParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/21_wombat_ovn_usdp.js");
const { strategyMagpieOvnUsdpParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/24_magpie_ovn_usdp.js");


async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'arbitrum');
    let StrategyMagpieUsdt = await getContract('StrategyMagpieUsdt', 'arbitrum');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyMagpieUsdt.address]));


    let StrategyMagpieDai = await getContract('StrategyMagpieDai', 'arbitrum_dai');

    addresses.push(StrategyMagpieDai.address);
    values.push(0);
    abis.push(StrategyMagpieDai.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyMagpieDai.address);
    values.push(0);
    abis.push(StrategyMagpieDai.interface.encodeFunctionData('setParams', [await strategyMagpieDaiParams()]));


    let StrategyMagpieOvnDaiPlus = await getContract('StrategyMagpieOvnDaiPlus', 'arbitrum_dai');

    addresses.push(StrategyMagpieOvnDaiPlus.address);
    values.push(0);
    abis.push(StrategyMagpieOvnDaiPlus.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyMagpieOvnDaiPlus.address);
    values.push(0);
    abis.push(StrategyMagpieOvnDaiPlus.interface.encodeFunctionData('setParams', [await strategyMagpieOvnDaiPlusParams()]));


    let StrategyWombatDai = await getContract('StrategyWombatDai', 'arbitrum_dai');

    addresses.push(StrategyWombatDai.address);
    values.push(0);
    abis.push(StrategyWombatDai.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyWombatDai.address);
    values.push(0);
    abis.push(StrategyWombatDai.interface.encodeFunctionData('setParams', [await strategyWombatDaiParams()]));


    let StrategyWombatOvnDaiPlus = await getContract('StrategyWombatOvnDaiPlus', 'arbitrum_dai');

    addresses.push(StrategyWombatOvnDaiPlus.address);
    values.push(0);
    abis.push(StrategyWombatOvnDaiPlus.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyWombatOvnDaiPlus.address);
    values.push(0);
    abis.push(StrategyWombatOvnDaiPlus.interface.encodeFunctionData('setParams', [await strategyWombatOvnDaiPlusParams()]));


    let StrategyMagpieOvnUsdp = await getContract('StrategyMagpieOvnUsdp', 'arbitrum');

    addresses.push(StrategyMagpieOvnUsdp.address);
    values.push(0);
    abis.push(StrategyMagpieOvnUsdp.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyMagpieOvnUsdp.address);
    values.push(0);
    abis.push(StrategyMagpieOvnUsdp.interface.encodeFunctionData('setParams', [await strategyMagpieOvnUsdpParams()]));


    let StrategyMagpieUsdc = await getContract('StrategyMagpieUsdc', 'arbitrum');

    addresses.push(StrategyMagpieUsdc.address);
    values.push(0);
    abis.push(StrategyMagpieUsdc.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyMagpieUsdc.address);
    values.push(0);
    abis.push(StrategyMagpieUsdc.interface.encodeFunctionData('setParams', [await strategyMagpieUsdcParams()]));


    let StrategyWombatOvnUsdp = await getContract('StrategyWombatOvnUsdp', 'arbitrum');

    addresses.push(StrategyWombatOvnUsdp.address);
    values.push(0);
    abis.push(StrategyWombatOvnUsdp.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyWombatOvnUsdp.address);
    values.push(0);
    abis.push(StrategyWombatOvnUsdp.interface.encodeFunctionData('setParams', [await strategyWombatOvnUsdpParams()]));


    let StrategyWombatUsdc = await getContract('StrategyWombatUsdc', 'arbitrum');

    addresses.push(StrategyWombatUsdc.address);
    values.push(0);
    abis.push(StrategyWombatUsdc.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyWombatUsdc.address);
    values.push(0);
    abis.push(StrategyWombatUsdc.interface.encodeFunctionData('setParams', [await strategyWombatUsdcParams()]));


    let StrategyWombatUsdt = await getContract('StrategyWombatUsdt', 'arbitrum');

    addresses.push(StrategyWombatUsdt.address);
    values.push(0);
    abis.push(StrategyWombatUsdt.interface.encodeFunctionData('upgradeTo', ['']));

    addresses.push(StrategyWombatUsdt.address);
    values.push(0);
    abis.push(StrategyWombatUsdt.interface.encodeFunctionData('setParams', [await strategyWombatUsdtParams()]));


    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

