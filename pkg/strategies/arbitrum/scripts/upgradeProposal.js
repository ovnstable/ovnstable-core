const {verify} = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, showM2M, getImplementation} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {strategyWombatUsdcParams} = require("../deploy/15_strategy_wombat_usdc");
const {strategyWombatUsdtParams} = require("../deploy/17_strategy_wombat_usdt");
const {strategyWombatDaiParams} = require("../deploy/16_strategy_wombat_dai");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let usdc = await getContract('StrategyWombatUsdc', 'arbitrum');
    let usdt = await getContract('StrategyWombatUsdt', 'arbitrum');
    let dai = await getContract('StrategyWombatDai', 'arbitrum_dai');

    addresses.push(usdc.address);
    values.push(0);
    abis.push(usdc.interface.encodeFunctionData('upgradeTo', [await getImplementation('StrategyWombatUsdc', 'arbitrum')]));

    addresses.push(usdc.address);
    values.push(0);
    abis.push(usdc.interface.encodeFunctionData('setParams', [await strategyWombatUsdcParams()]));

    addresses.push(usdc.address);
    values.push(0);
    abis.push(usdc.interface.encodeFunctionData('stakeAssetsToWombex', []));



    addresses.push(usdt.address);
    values.push(0);
    abis.push(usdt.interface.encodeFunctionData('upgradeTo', [await getImplementation('StrategyWombatUsdt', 'arbitrum')]));

    addresses.push(usdt.address);
    values.push(0);
    abis.push(usdt.interface.encodeFunctionData('setParams', [await strategyWombatUsdtParams()]));

    addresses.push(usdt.address);
    values.push(0);
    abis.push(usdt.interface.encodeFunctionData('stakeAssetsToWombex', []));

    addresses.push(dai.address);
    values.push(0);
    abis.push(dai.interface.encodeFunctionData('upgradeTo', [await getImplementation('StrategyWombatDai', 'arbitrum_dai')]));

    addresses.push(dai.address);
    values.push(0);
    abis.push(dai.interface.encodeFunctionData('setParams', [await strategyWombatDaiParams()]));

    addresses.push(dai.address);
    values.push(0);
    abis.push(dai.interface.encodeFunctionData('stakeAssetsToWombex', []));


    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

