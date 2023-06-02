const { getContract, execTimelock, initWallet, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { strategyWombatDaiParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/03_strategy_wombat_dai.js");
const { strategyMagpieDaiParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/04_strategy_magpie_dai.js");
const { strategyWombatOvnDaiPlusParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/05_wombat_ovn_daiplus.js");
const { strategyMagpieOvnDaiPlusParams } = require("@overnight-contracts/strategies-arbitrum/deploy/dai/06_magpie_ovn_daiplus.js");
const { strategyWombatUsdcParams } = require("@overnight-contracts/strategies-arbitrum/deploy/15_strategy_wombat_usdc.js");
const { strategyWombatUsdtParams } = require("@overnight-contracts/strategies-arbitrum/deploy/17_strategy_wombat_usdt.js");
const { strategyMagpieUsdcParams } = require("@overnight-contracts/strategies-arbitrum/deploy/18_strategy_magpie_usdc.js");
const { strategyWombatOvnUsdpParams } = require("@overnight-contracts/strategies-arbitrum/deploy/21_wombat_ovn_usdp.js");
const { strategyMagpieOvnUsdpParams } = require("@overnight-contracts/strategies-arbitrum/deploy/24_magpie_ovn_usdp.js");
const {Roles} = require("@overnight-contracts/common/utils/roles");


async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'arbitrum');
    let StrategyMagpieUsdt = await getContract('StrategyMagpieUsdt', 'arbitrum');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('grantRole', [Roles.PORTFOLIO_AGENT_ROLE, (await initWallet()).address]));

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategyMagpieUsdt.address]));


    let StrategyMagpieOvnUsdp = await getContract('StrategyMagpieOvnUsdp', 'arbitrum');

    addresses.push(StrategyMagpieOvnUsdp.address);
    values.push(0);
    abis.push(StrategyMagpieOvnUsdp.interface.encodeFunctionData('upgradeTo', ['0x7D3045d464b40875dbDCBc1e75CFd7E256b5Cc3C']));

    addresses.push(StrategyMagpieOvnUsdp.address);
    values.push(0);
    abis.push(StrategyMagpieOvnUsdp.interface.encodeFunctionData('setParams', [await strategyMagpieOvnUsdpParams()]));


    let StrategyMagpieUsdc = await getContract('StrategyMagpieUsdc', 'arbitrum');

    addresses.push(StrategyMagpieUsdc.address);
    values.push(0);
    abis.push(StrategyMagpieUsdc.interface.encodeFunctionData('upgradeTo', ['0x873a2654C73639132CAa0aFb8938bD81279e4E45']));

    addresses.push(StrategyMagpieUsdc.address);
    values.push(0);
    abis.push(StrategyMagpieUsdc.interface.encodeFunctionData('setParams', [await strategyMagpieUsdcParams()]));


    let StrategyWombatOvnUsdp = await getContract('StrategyWombatOvnUsdp', 'arbitrum');

    addresses.push(StrategyWombatOvnUsdp.address);
    values.push(0);
    abis.push(StrategyWombatOvnUsdp.interface.encodeFunctionData('upgradeTo', ['0xE965f51008B0a1FBEB2B82d407179696C4716830']));

    addresses.push(StrategyWombatOvnUsdp.address);
    values.push(0);
    abis.push(StrategyWombatOvnUsdp.interface.encodeFunctionData('setParams', [await strategyWombatOvnUsdpParams()]));


    let StrategyWombatUsdc = await getContract('StrategyWombatUsdc', 'arbitrum');

    addresses.push(StrategyWombatUsdc.address);
    values.push(0);
    abis.push(StrategyWombatUsdc.interface.encodeFunctionData('upgradeTo', ['0x8052963910C14C0F0378C3b80BBA3328F028091C']));

    addresses.push(StrategyWombatUsdc.address);
    values.push(0);
    abis.push(StrategyWombatUsdc.interface.encodeFunctionData('setParams', [await strategyWombatUsdcParams()]));


    let StrategyWombatUsdt = await getContract('StrategyWombatUsdt', 'arbitrum');

    addresses.push(StrategyWombatUsdt.address);
    values.push(0);
    abis.push(StrategyWombatUsdt.interface.encodeFunctionData('upgradeTo', ['0xBCd5c3dc25202e5ff2f63EC50118a1754cA249D7']));

    addresses.push(StrategyWombatUsdt.address);
    values.push(0);
    abis.push(StrategyWombatUsdt.interface.encodeFunctionData('setParams', [await strategyWombatUsdtParams()]));


    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    // StrategyWombatUsdc = await getContract('StrategyWombatUsdc', 'arbitrum');
    // StrategyMagpieUsdc = await getContract('StrategyMagpieUsdc', 'arbitrum');
    // await (await StrategyWombatUsdc.sendLPTokens(StrategyMagpieUsdc.address, 5000)).wait();
    // await (await StrategyMagpieUsdc.stakeLPTokens()).wait();
    // console.log("StrategyWombatUsdc -> StrategyMagpieUsdc done");
    //
    // StrategyWombatUsdt = await getContract('StrategyWombatUsdt', 'arbitrum');
    // StrategyMagpieUsdt = await getContract('StrategyMagpieUsdt', 'arbitrum');
    // await (await StrategyWombatUsdt.sendLPTokens(StrategyMagpieUsdt.address, 5000)).wait();
    // await (await StrategyMagpieUsdt.stakeLPTokens()).wait();
    // console.log("StrategyWombatUsdt -> StrategyMagpieUsdt done");
    //
    // await showM2M();

    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

