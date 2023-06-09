const { getContract, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy} = require("@overnight-contracts/common/utils/governance");
const {strategyPendleDaiGDaiParams} = require("@overnight-contracts/strategies-arbitrum/deploy/dai/10_pendle_dai_gdai");
const {strategyPendleDaiUsdtParams} = require("@overnight-contracts/strategies-arbitrum/deploy/dai/09_pendle_dai_usdt");
const {strategyPendleUsdcUsdtParams} = require("@overnight-contracts/strategies-arbitrum/deploy/30_pendle_usdc_usdt");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let pendleGDai = await getContract('StrategyPendleDaiGDai', 'arbitrum_dai');
    let pendleDaiUsdt = await getContract('StrategyPendleDaiUsdt', 'arbitrum_dai');
    let pendleUsdcUsdt = await getContract('StrategyPendleUsdcUsdt', 'arbitrum');

    addresses.push(pendleGDai.address);
    values.push(0);
    abis.push(pendleGDai.interface.encodeFunctionData('upgradeTo', ['0xafBcb41c5D5A388440Eb11FA59D45D09a5d3c212']));

    addresses.push(pendleGDai.address);
    values.push(0);
    abis.push(pendleGDai.interface.encodeFunctionData('setParams', [await strategyPendleDaiGDaiParams()]));


    addresses.push(pendleDaiUsdt.address);
    values.push(0);
    abis.push(pendleDaiUsdt.interface.encodeFunctionData('upgradeTo', ['0x7e93310B2E538381B04f7E5d8183a3bcee9ae5CD']));

    addresses.push(pendleDaiUsdt.address);
    values.push(0);
    abis.push(pendleDaiUsdt.interface.encodeFunctionData('setParams', [await strategyPendleDaiUsdtParams()]));

    addresses.push(pendleUsdcUsdt.address);
    values.push(0);
    abis.push(pendleUsdcUsdt.interface.encodeFunctionData('upgradeTo', ['0xF73b0D870836B0914B7fA24D44231F5a7F54c304']));

    addresses.push(pendleUsdcUsdt.address);
    values.push(0);
    abis.push(pendleUsdcUsdt.interface.encodeFunctionData('setParams', [await strategyPendleUsdcUsdtParams()]));


    await createProposal(addresses, values, abis);
    // await showM2M();
    // await testProposal(addresses, values, abis);
    // await showM2M();
    //
    // await testStrategy(pendleUsdcUsdt);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

